
import os from "os";
import fs from "fs";
import zlib from "node:zlib";
import path from "path";
import picomatch from "picomatch";
import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";
import { fileURLToPath } from 'url';
import { Cache } from "@kirigami/sdk";
import { c, log, parseArgs, printCommandHelp } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files that may sit at the root of a template but must never be copied into
// the new project (local caches, dev cookie jar, npm lockfile regenerated on
// the first install).
const SKIP = new Set([".cache.db", ".node.db", ".cookie.txt", "package-lock.json"]);


const HELP = {
	name: "create",
	description: "Create a new Kirigami project from an official template.",
	usage: "<template> [project-name] [options]",
	options: [
		{ flag: "--list, -l", desc: "List available templates (from the php-kirigami org)" },
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Templates are GitHub repositories named \"template-<name>\" under the php-kirigami organization.",
		"The template list is cached locally for 1 hour to avoid hitting the GitHub API on every call.",
		"Without a project name the template is extracted into the current directory.",
		"The target directory must be empty — unless it already holds a package.json, in which case the template's package.json is deep-merged into it (keeping every existing dependency) and \"npm install\" is run.",
	],
	examples: [
		"kiri create --list",
		"kiri create blog my-blog",
	],
};


// Shared cache instance (template list). Global, in the user config directory —
// `create` isn't tied to a project and often runs in an empty/foreign folder,
// so a per-project .node.db (what the rest of core uses) makes no sense here.
let _cache;
function cache() {
	if (_cache) return _cache;
	const file = path.join(os.homedir(), ".config", "kirigami", "kiri.db");
	fs.mkdirSync(path.dirname(file), { recursive: true });
	return (_cache = new Cache(file));
}


async function listRepos(owner, pattern = "*", type = "org") {
	const octokit = new Octokit();
	const isMatch = picomatch(pattern);
	const repos = [];
	const iterator =
		type === "org"
			? octokit.paginate.iterator(octokit.rest.repos.listForOrg, { org: owner, per_page: 100 })
			: octokit.paginate.iterator(octokit.rest.repos.listForUser, { username: owner, per_page: 100 });
	for await (const { data } of iterator) {
		for (const repo of data) {
			if (isMatch(repo.name)) {
				repos.push({
					name: repo.name,
					full_name: repo.full_name,
					private: repo.private,
					description: repo.description,
					url: repo.html_url,
					default_branch: repo.default_branch,
					zip_url: `https://github.com/${repo.full_name}/archive/refs/heads/${repo.default_branch}.zip`,
					stars: repo.stargazers_count,
					updated_at: repo.updated_at,
				});
			}
		}
	}
	return repos;
}


async function getTemplates() {
	let repos = cache().get('templates_list');
	if (!repos) {
		repos = await listRepos('php-kirigami', 'template-*');
		cache().set('templates_list', repos, 60 * 60); // 1 h TTL
	}
	return repos.map(repo => { return { template: repo.name.replace(/^template-/, ''), ...repo }; });
}



async function printList() {
	const templates = await getTemplates();
	const colWidth = Math.max(...templates.map(t => t.template.length)) + 4;
	console.log(`\n${c.bold(c.cyan("kiri"))} — List of avaiable templates\n`);
	console.log(c.dim(`${"TEMPLATE".padEnd(colWidth)}DESCRIPTION`));
	console.log(`${"-".repeat(colWidth + 30)}`);
	for (const t of templates) {
		const name = c.cyan(t.template).padEnd(colWidth + 9); // +9 for the escape codes
		console.log(`${name}${t.description}`);
	}
	console.log();
}



// ─── tar extraction (zero-dependency) ───────────────────────────────────────
// Node has no zip API; we download GitHub's .tar.gz, inflate it with node:zlib
// then parse the tar format (512-byte blocks, ustar headers + pax "x" / GNU "L"
// extensions for long paths).
function parseTar(buf) {
	const entries = [];
	let offset = 0;
	let longName = null;   // GNU 'L' header → name of the next entry
	let paxName = null;    // pax 'x' header → "path" field of the next entry

	while (offset + 512 <= buf.length) {
		const header = buf.subarray(offset, offset + 512);
		offset += 512;

		// An all-zero block marks the end of the archive.
		if (header.every(b => b === 0)) break;

		const readStr = (start, len) => {
			const raw = header.subarray(start, start + len);
			const end = raw.indexOf(0);
			return raw.toString('utf8', 0, end === -1 ? len : end);
		};
		const readOctal = (start, len) => {
			const s = readStr(start, len).trim();
			return s ? parseInt(s, 8) : 0;
		};

		let name = readStr(0, 100);
		const size = readOctal(124, 12);
		const type = String.fromCharCode(header[156]);
		const prefix = readStr(345, 155);
		if (prefix) name = `${prefix}/${name}`;

		const data = buf.subarray(offset, offset + size);
		offset += Math.ceil(size / 512) * 512;

		if (type === 'L') { longName = data.toString('utf8').replace(/\0+$/, ''); continue; }
		if (type === 'x' || type === 'g') {
			const m = data.toString('utf8').match(/\d+ path=([^\n]+)\n/);
			if (m && type === 'x') paxName = m[1];
			continue;
		}

		if (longName) { name = longName; longName = null; }
		if (paxName) { name = paxName; paxName = null; }

		entries.push({
			name,
			type: type === '5' ? 'dir' : 'file',
			data: type === '5' ? null : data,
		});
	}

	return entries;
}


const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Deep merge where `base` (the existing project) wins: we only add what's
// missing, never overwrite a value that's already set. Arrays are unioned
// (primitives de-duplicated), objects merged recursively, and leaf conflicts
// keep the `base` value.
function deepMerge(base, overlay) {
	if (Array.isArray(base) && Array.isArray(overlay)) {
		const out = [...base];
		for (const item of overlay) {
			if (isPlainObject(item) || !out.includes(item)) out.push(item);
		}
		return out;
	}
	if (isPlainObject(base) && isPlainObject(overlay)) {
		const out = { ...base };
		for (const [k, v] of Object.entries(overlay)) {
			out[k] = k in out ? deepMerge(out[k], v) : v;
		}
		return out;
	}
	return base;
}


async function downloadTemplate(tpl, target) {
	const url = `https://github.com/${tpl.full_name}/archive/refs/heads/${tpl.default_branch}.tar.gz`;
	log.step(`Downloading ${c.dim(url)}`);

	let tar;
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
		tar = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
	} catch (err) {
		log.error(`Download failed: ${err.message}`);
		console.log();
		process.exit(1);
	}

	fs.mkdirSync(target, { recursive: true });

	const result = { written: 0, skipped: 0, merged: false };
	for (const entry of parseTar(tar)) {
		// GitHub archives wrap everything in a "<repo>-<sha>/" folder: drop that
		// first segment.
		const rel = entry.name.split('/').slice(1).join('/');
		if (!rel || rel.split('/').includes('..')) continue;
		if (SKIP.has(rel)) continue;

		const dest = path.join(target, rel);

		if (entry.type === 'dir') {
			fs.mkdirSync(dest, { recursive: true });
			continue;
		}

		fs.mkdirSync(path.dirname(dest), { recursive: true });

		// package.json already there → deep merge (keep the existing project's
		// deps, add the template's).
		if (rel === 'package.json' && fs.existsSync(dest)) {
			const existing = JSON.parse(fs.readFileSync(dest, 'utf8'));
			const incoming = JSON.parse(entry.data.toString('utf8'));
			fs.writeFileSync(dest, JSON.stringify(deepMerge(existing, incoming), null, 2) + '\n');
			result.merged = true;
			continue;
		}

		// Any other already-present file is left untouched.
		if (fs.existsSync(dest)) {
			result.skipped++;
			continue;
		}

		fs.writeFileSync(dest, entry.data);
		result.written++;
	}

	return result;
}




export default async function create(args) {
	const { flags, command, subcommand } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	if (flags.list || flags.l || command == 'list') {
		await printList();
		return;
	}


	console.log(`\n${c.bold(c.cyan("kiri"))} — Create Project\n`);

	if (!command) {
		log.error("Missing template name.");
		console.log(`\nRun ${c.cyan("kiri create --list")} to see available templates.\n`);
		process.exit(1);
	}

	const templateName = command;
	const target = subcommand ? path.resolve(process.cwd(), subcommand) : process.cwd();

	// The target directory must be empty — unless it already holds a
	// package.json, in which case we graft the template onto the existing
	// Node project. Local cache/cookie files (SKIP) left by other kiri
	// commands don't count as "not empty".
	const existing = fs.existsSync(target) ? fs.readdirSync(target) : [];
	const hasPkg = existing.includes('package.json');
	const meaningful = existing.filter(f => !SKIP.has(f));
	if (meaningful.length > 0 && !hasPkg) {
		log.error(`Target directory is not empty: ${c.dim(target)}`);
		console.log();
		process.exit(1);
	}

	log.step(`Template : ${c.dim(templateName)}`);
	log.step(`Target   : ${c.dim(target)}${hasPkg ? c.dim(' (existing Node project)') : ''}`);

	const templates = await getTemplates();
	const tpl = templates.find(t => t.template === templateName);
	if (!tpl) {
		log.error(`Unknown template "${templateName}".`);
		console.log(`\nAvailable: ${templates.map(t => c.cyan(t.template)).join(', ')}\n`);
		process.exit(1);
	}

	const { written, skipped, merged } = await downloadTemplate(tpl, target);

	if (skipped) log.step(`${skipped} existing file(s) left untouched.`);
	if (merged) log.step(`Merged template package.json into the existing one.`);

	// Pre-existing Node project → (re)install dependencies.
	if (merged) {
		console.log();
		log.step(`Running ${c.dim('npm install')}\n`);
		try {
			execSync('npm install', { cwd: target, stdio: 'inherit' });
		} catch (err) {
			console.log();
			log.error(`npm install failed: ${err.message}`);
			process.exit(1);
		}
	}

	console.log();
	log.success(c.bold(c.green(` Project created from "${templateName}" — ${written} files.`)));
	if (!merged && written && fs.existsSync(path.join(target, 'package.json'))) {
		console.log(`\n  Next: ${c.cyan('npm install')}`);
	}
	console.log();
}
