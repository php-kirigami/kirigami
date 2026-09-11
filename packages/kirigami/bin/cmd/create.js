
import os from "os";
import fs from "fs";
import zlib from "node:zlib";
import path from "path";
import picomatch from "picomatch";
import { execSync } from "child_process";
import { Octokit } from "@octokit/rest";
import { fileURLToPath } from 'url';
import { Cache } from "@kirigami/sdk";
import { deriveRepo } from "../config.js";
import { c, log, parseArgs, printCommandHelp, isInteractive, ask, confirm, select } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files that may sit at the root of a template but must never be copied into
// the new project (local caches, dev cookie jar, npm lockfile regenerated on
// the first install).
const SKIP = new Set([".cache.db", ".node.db", ".cookie.txt", "package-lock.json"]);


const HELP = {
	name: "create",
	description: "Create a new Kirigami project from an official template.",
	usage: "[template] [project-name] [options]",
	options: [
		{ flag: "--list, -l", desc: "List available templates (from the php-kirigami org)" },
		{ flag: "--name <name>", desc: "Project name (package.json name + kirigami.yaml project)" },
		{ flag: "--description <s>", desc: "Project description" },
		{ flag: "--author <name>", desc: "Author" },
		{ flag: "--email <email>", desc: "Author email (kirigami.yaml email)" },
		{ flag: "--baseurl <url>", desc: "Site base URL (kirigami.yaml baseurl)" },
		{ flag: "--repo <url>", desc: "Git repository URL (kirigami.yaml repo; default: derived from baseurl)" },
		{ flag: "--yes, -y", desc: "Non-interactive: take defaults, ask nothing" },
		{ flag: "--no-git", desc: "Don't initialise a git repository" },
		{ flag: "--no-install", desc: "Don't run \"npm install\" afterwards" },
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Templates are the php-kirigami repos named \"template-<name>\" (list cached 1h).",
		"No arguments, in a terminal → interactive wizard.",
		"Never overwrites: existing files are kept, package.json is deep-merged (your deps win).",
		"Missing package.json / banner.txt get a starter one; git repo + first commit unless --no-git; npm install unless --no-install.",
		"The banner keeps its ### ### tokens on disk — kiri fills them (date, author, repo, …) on every build/export.",
		"Every template ships a CLAUDE.md, ready for Claude Code out of the box.",
	],
	examples: [
		"kiri create",
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




// ─── git ───────────────────────────────────────────────────────────────────
function hasGit() {
	try { execSync('git --version', { stdio: 'ignore' }); return true; }
	catch { return false; }
}

function insideGitWorktree(dir) {
	try {
		return execSync('git rev-parse --is-inside-work-tree', { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] })
			.toString().trim() === 'true';
	} catch { return false; }
}

// Initialise a repo + one initial commit, unless the target is already inside a
// worktree (dropping the template into an existing project) or git is missing.
// A failed commit (no user.name / user.email) is a warning, not a failure.
async function maybeGitInit(target, templateName, { interactive, flags }) {
	if (flags['no-git']) return;
	if (!hasGit()) { log.step(c.dim('git not found — skipped repo init.')); return; }
	if (insideGitWorktree(target)) { log.step(c.dim('Already inside a git repository — skipped git init.')); return; }
	if (interactive && !(await confirm('Initialise a git repository?', true))) return;

	try {
		execSync('git init -q', { cwd: target, stdio: 'ignore' });
		execSync('git add -A', { cwd: target, stdio: 'ignore' });
		execSync(`git commit -q -m ${JSON.stringify(`Initial commit from kiri create ${templateName}`)}`,
			{ cwd: target, stdio: 'ignore' });
		log.step('Initialised git repository with an initial commit.');
	} catch (err) {
		log.warn(`git repo created but the first commit failed — ${String(err.message).split('\n')[0]}`);
		log.step(c.dim('Set user.name / user.email, then commit manually.'));
	}
}


// ─── project metadata (package.json + kirigami.yaml) ───────────────────────
function gitConfig(key) {
	try {
		return execSync(`git config ${key}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
	} catch { return ''; }
}

// A directory name → a valid npm package name.
function toPackageName(s) {
	return String(s).trim().toLowerCase()
		.replace(/[^a-z0-9._~-]+/g, '-')
		.replace(/^[-_.]+|[-_.]+$/g, '') || 'kirigami-site';
}

// Reads kiri's own package.json (this file is bin/cmd/create.js) so a generated
// package.json pins the @kirigami/* versions that match the running CLI.
function kiriManifest() {
	return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
}

// Asks (or takes from flags) the four fields the wizard writes into both
// package.json and kirigami.yaml. An empty answer means "leave the template's".
async function collectMeta(target, { interactive, flags }) {
	const dirName = path.basename(target);
	const meta = {
		name:        flags.name || '',
		description: flags.description || '',
		author:      flags.author || '',
		email:       flags.email || '',
		baseurl:     flags.baseurl || '',
		repo:        flags.repo || '',
	};

	if (interactive) {
		meta.name        = await ask('Project name', { default: meta.name || dirName });
		meta.description = await ask('Description', { default: meta.description });
		meta.author      = await ask('Author', { default: meta.author || gitConfig('user.name') });
		meta.email       = await ask('Author email', { default: meta.email || gitConfig('user.email') });
		meta.baseurl     = await ask('Site base URL', { default: meta.baseurl });
		meta.repo        = await ask('Git repository URL', { default: meta.repo || deriveRepo(meta.baseurl) });
	} else {
		meta.name ||= dirName;
		meta.repo ||= deriveRepo(meta.baseurl);
	}

	meta.name = meta.name.trim();
	meta.slug = toPackageName(meta.name);
	return meta;
}

// A YAML plain scalar is fine unless it would be misread: empty, a leading
// indicator char, a `": "` / `" #"` sequence, edge whitespace, a bare bool/null,
// or something number-like. Then double-quote it.
function yamlScalar(v) {
	const bad = v === ''
		|| /^[\s>|@`"'%!&*?#,[\]{}-]/.test(v)
		|| /:\s|\s#|^\s|\s$/.test(v)
		|| /^(true|false|null|yes|no|on|off|~)$/i.test(v)
		|| /^[-+]?(\d|\.\d)/.test(v);
	return bad ? JSON.stringify(v) : v;
}

// Sets a scalar key inside the top-level `kirigami:` block, preserving the rest
// of the file (comments, other blocks). Replaces the value if the key is there,
// otherwise appends the key at the end of the block, matching the block's
// existing "key:   value" column where there is one.
function setKirigamiKey(yaml, key, value) {
	const lines = yaml.split('\n');
	const start = lines.findIndex((l) => /^kirigami:\s*$/.test(l));
	if (start === -1) return yaml;

	let end = start + 1;
	while (end < lines.length && (lines[end].trim() === '' || /^\s/.test(lines[end]))) end++;

	const scalar = yamlScalar(value);
	const at = lines.findIndex((l, i) => i >= start && i < end && new RegExp(`^\\s+${key}:(\\s|$)`).test(l));

	if (at !== -1) {
		const keyIndent = lines[at].match(/^\s*/)[0].length;
		const rhs = lines[at].slice(lines[at].indexOf(':') + 1).trim();
		lines[at] = lines[at].replace(/^(\s+\S+:[ \t]*).*$/, `$1${scalar}`);
		// `description: >-` and friends: drop the folded/literal continuation.
		if (/^[|>][+-]?\d*$/.test(rhs)) {
			let n = at + 1;
			while (n < lines.length && lines[n].trim() !== '' && lines[n].match(/^\s*/)[0].length > keyIndent) n++;
			lines.splice(at + 1, n - at - 1);
		}
		return lines.join('\n');
	}

	// New key: copy the indent + value column from a sibling line.
	const sibling = lines.slice(start + 1, end).find((l) => /^(\s+)\S+:[ \t]+\S/.test(l));
	const m = sibling && sibling.match(/^(\s+)(\S+:)([ \t]+)/);
	const indent = m ? m[1] : '  ';
	const pad = m ? ' '.repeat(Math.max(1, m[2].length + m[3].length - key.length - 1)) : ' ';

	let insert = end;
	while (insert > start + 1 && lines[insert - 1].trim() === '') insert--;
	lines.splice(insert, 0, `${indent}${key}:${pad}${scalar}`);
	return lines.join('\n');
}

// `fillOnly`: only set keys that are currently missing/empty (used when grafting
// onto a project that already had its own package.json).
function applyMeta(target, meta, { fillOnly, created }) {
	const changed = [];

	const pkgPath = path.join(target, 'package.json');
	if (fs.existsSync(pkgPath)) {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
		const set = (k, v) => {
			if (!v) return;
			if (fillOnly && pkg[k] && !(created && k === 'name')) return;
			if (pkg[k] !== v) { pkg[k] = v; changed.push(k); }
		};
		set('name', meta.slug);
		set('description', meta.description);
		set('author', meta.author);
		fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
	}

	const yamlPath = path.join(target, 'kirigami.yaml');
	if (fs.existsSync(yamlPath)) {
		let yaml = fs.readFileSync(yamlPath, 'utf8');
		for (const [key, value] of [
			['project', meta.name], ['baseurl', meta.baseurl],
			['description', meta.description], ['author', meta.author],
			['email', meta.email], ['repo', meta.repo],
		]) {
			if (!value) continue;
			const next = setKirigamiKey(yaml, key, value);
			if (next !== yaml) { yaml = next; changed.push(key); }
		}
		fs.writeFileSync(yamlPath, yaml);
	}

	return [...new Set(changed)];
}

// Written when the template ships no package.json (e.g. template-default).
function writeMinimalPackageJson(target, meta) {
	const kiri = kiriManifest();
	const pkg = {
		name: meta.slug,
		version: '1.0.0',
		description: meta.description || '',
		author: meta.author || '',
		license: 'MIT',
		type: 'module',
		private: true,
		engines: { node: '>=24.0.0', npm: '>=10.2.3' },
		scripts: { build: 'kiri build', watch: 'kiri watch', export: 'kiri export' },
		devDependencies: {
			'@kirigami/kirigami': `^${kiri.version}`,
			'@kirigami/canva': `^${kiri.dependencies['@kirigami/canva']}`,
		},
	};
	fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

// Written when the template ships no banner.txt. The ### ### tokens are left in
// place — `kiri build` / `kiri export` fill them (date, project, author, email,
// repo, base URL) from the config every time.
function writeStarterBanner(target) {
	const dest = path.join(target, 'banner.txt');
	if (fs.existsSync(dest)) return false;
	const tpl = path.join(__dirname, '..', '..', 'assets', 'banner-template.txt');
	if (!fs.existsSync(tpl)) return false;

	fs.writeFileSync(dest, fs.readFileSync(tpl, 'utf8'));

	// Point kirigami.yaml at it, unless a `banner:` key is already there.
	const yamlPath = path.join(target, 'kirigami.yaml');
	if (fs.existsSync(yamlPath)) {
		const yaml = fs.readFileSync(yamlPath, 'utf8');
		if (!/^[ \t]+banner:/m.test(yaml)) {
			fs.writeFileSync(yamlPath, setKirigamiKey(yaml, 'banner', 'banner.txt'));
		}
	}
	return true;
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

	const interactive = isInteractive() && !flags.yes && !flags.y;

	console.log(`\n${c.bold(c.cyan("kiri"))} — Create Project\n`);

	const templates = await getTemplates();
	if (!templates.length) {
		log.error("No templates found — the GitHub API may be unreachable.");
		console.log();
		process.exit(1);
	}

	// ── template ─────────────────────────────────────────────────────────
	let templateName = command;
	if (!templateName && interactive) {
		templateName = await select('Which template?', templates.map(t => ({
			value: t.template,
			label: c.cyan(t.template),
			hint: t.description || '',
		})));
	}
	if (!templateName) {
		log.error("Missing template name.");
		console.log(`\nRun ${c.cyan("kiri create --list")} to see available templates.\n`);
		process.exit(1);
	}

	const tpl = templates.find(t => t.template === templateName);
	if (!tpl) {
		log.error(`Unknown template "${templateName}".`);
		console.log(`\nAvailable: ${templates.map(t => c.cyan(t.template)).join(', ')}\n`);
		process.exit(1);
	}

	// ── target directory ─────────────────────────────────────────────────
	let dirArg = subcommand;
	if (!dirArg && interactive) {
		dirArg = await ask('Project directory', { default: '.' });
	}
	const target = dirArg && dirArg !== '.'
		? path.resolve(process.cwd(), dirArg)
		: process.cwd();

	// Extraction is non-destructive (existing files kept, package.json merged),
	// so a non-empty target is fine — just say what's already there. `SKIP`
	// files (local caches / lockfile) don't count.
	const existing = fs.existsSync(target) ? fs.readdirSync(target) : [];
	const hasPkg = existing.includes('package.json');
	const clutter = existing.filter(f => !SKIP.has(f));

	log.step(`Template : ${c.dim(templateName)}`);
	log.step(`Target   : ${c.dim(target)}${hasPkg ? c.dim(' (existing Node project)') : ''}`);
	if (clutter.length) {
		log.step(c.dim(`${clutter.length} item(s) already here — kept as-is; only missing files are added.`));
	}

	if (interactive && !(await confirm(`Create here?`, true))) {
		console.log('Aborted.\n');
		process.exit(1);
	}

	// ── project metadata ─────────────────────────────────────────────────
	if (interactive) console.log();
	const meta = await collectMeta(target, { interactive, flags });

	// ── extract ──────────────────────────────────────────────────────────
	if (interactive) console.log();
	const { written, skipped, merged } = await downloadTemplate(tpl, target);
	if (skipped) log.step(`${skipped} existing file(s) left untouched.`);
	if (merged) log.step(`Merged the template's package.json into the existing one.`);

	// ── apply metadata ───────────────────────────────────────────────────
	const createdPkg = !fs.existsSync(path.join(target, 'package.json'));
	if (createdPkg) {
		writeMinimalPackageJson(target, meta);
		log.step('Wrote a starter package.json (the template ships none).');
	}
	const changed = applyMeta(target, meta, { fillOnly: hasPkg, created: createdPkg });
	if (changed.length) log.step(`Filled ${changed.join(', ')} in package.json / kirigami.yaml.`);

	if (writeStarterBanner(target)) {
		log.step('Wrote a starter banner.txt (kiri fills its ### ### tokens on build).');
	}

	// ── git ──────────────────────────────────────────────────────────────
	await maybeGitInit(target, templateName, { interactive, flags });

	// ── npm install ──────────────────────────────────────────────────────
	if (!flags['no-install'] && fs.existsSync(path.join(target, 'package.json'))) {
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
	log.success(c.bold(c.green(` Project created from "${templateName}" — ${written} file(s) written.`)));
	console.log();
}
