// ---------------------------------------------------------------------------
// Project scaffolding — everything behind `kiri create`, the VS Code
// extension's "Create Project" and the MCP `kirigami_create_project` tool.
//
// Pure API: no prompts, no console output, no process.exit(). Interfaces ask
// their own questions, then call createProject(). Independent from the rest
// of core (no kirigami.yaml, no PHP runtime), so importing
// "@kirigami/kirigami/create" stays cheap.
//
// Templates are the php-kirigami GitHub repositories named "template-<name>".
// Extraction never overwrites: existing files are kept and an existing
// package.json is deep-merged (the project's values win).
// ---------------------------------------------------------------------------

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { Cache } from "@kirigami/sdk";
import { deriveRepo } from "./config.js";
import { listRepos } from "./libs/github.js";
import { parseTar } from "./libs/tar.js";
import { spawnNpm } from "./libs/npm.js";

export const TEMPLATE_OWNER = "php-kirigami";
const TEMPLATE_PREFIX = "template-";
const TEMPLATES_TTL = 60 * 60; // 1 h

// Files that may sit at the root of a template but must never be copied into
// the new project (local caches, dev cookie jar, npm lockfile regenerated on
// the first install). Also ignored when reporting what a target already holds.
export const SKIP = new Set([".cache.db", ".node.db", ".cookie.txt", "package-lock.json"]);


// Global cache (template list), in the user config directory — scaffolding
// isn't tied to a project and often runs in an empty/foreign folder, so the
// per-project .node.db the rest of core uses makes no sense here. Opened per
// use and closed right away: long-lived embedders shouldn't hold the file.
function withCache(fn) {
	const file = path.join(os.homedir(), ".config", "kirigami", "kiri.db");
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const cache = new Cache(file);
	try { return fn(cache); }
	finally { cache.close(); }
}


// ─── templates ─────────────────────────────────────────────────────────────

// [{ template, name, full_name, description, url, default_branch, … }], the
// list cached for an hour. `refresh` bypasses the cache. Throws when GitHub
// is unreachable and nothing is cached.
export async function listTemplates({ refresh = false } = {}) {
	let repos = refresh ? null : withCache(cache => cache.get("templates_list"));
	if (!repos) {
		repos = await listRepos(TEMPLATE_OWNER, { pattern: `${TEMPLATE_PREFIX}*` });
		withCache(cache => cache.set("templates_list", repos, TEMPLATES_TTL));
	}
	return repos
		.map(repo => ({ template: repo.name.slice(TEMPLATE_PREFIX.length), ...repo }))
		.sort((a, b) => a.template.localeCompare(b.template));
}

// "blog" or "template-blog" → its entry, or null.
export async function findTemplate(name, options) {
	const wanted = String(name).replace(new RegExp(`^${TEMPLATE_PREFIX}`), "");
	return (await listTemplates(options)).find(t => t.template === wanted) || null;
}

export function archiveUrl(tpl) {
	return `https://github.com/${tpl.full_name}/archive/refs/heads/${tpl.default_branch}.tar.gz`;
}


// ─── target inspection & metadata ─────────────────────────────────────────

// What the target directory already holds. A non-empty target is fine
// (extraction is non-destructive); interfaces use this to say so.
export function inspectTarget(target) {
	const dir = path.resolve(target);
	const names = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
	return {
		target: dir,
		exists: fs.existsSync(dir),
		hasPackageJson: names.includes("package.json"),
		hasConfig: names.includes("kirigami.yaml"),
		entries: names.filter(f => !SKIP.has(f)),
	};
}

function gitConfig(key) {
	try {
		return execFileSync("git", ["config", key], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
	} catch { return ""; }
}

// Defaults for the author fields, from the user's git configuration.
export function gitUserConfig() {
	return { name: gitConfig("user.name"), email: gitConfig("user.email") };
}

// A directory name → a valid npm package name.
export function toPackageName(s) {
	return String(s).trim().toLowerCase()
		.replace(/[^a-z0-9._~-]+/g, "-")
		.replace(/^[-_.]+|[-_.]+$/g, "") || "kirigami-site";
}

// Fills the fields the caller left empty: name (target directory name), repo
// (derived from a *.github.io baseurl), and the npm `slug`. Other empty
// fields mean "keep the template's value".
export function resolveMeta(target, meta = {}) {
	const out = {
		name: String(meta.name || "").trim() || path.basename(path.resolve(target)),
		description: meta.description || "",
		author: meta.author || "",
		email: meta.email || "",
		baseurl: meta.baseurl || "",
		repo: meta.repo || deriveRepo(meta.baseurl),
	};
	out.slug = toPackageName(out.name);
	return out;
}


// ─── extraction ────────────────────────────────────────────────────────────

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Deep merge where `base` (the existing project) wins: we only add what's
// missing, never overwrite a value that's already set. Arrays are unioned
// (primitives de-duplicated), objects merged recursively, and leaf conflicts
// keep the `base` value.
export function deepMerge(base, overlay) {
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

// Writes a GitHub tarball into `target`. Returns { written, skipped, merged }.
export function extractArchive(tar, target) {
	fs.mkdirSync(target, { recursive: true });

	const result = { written: 0, skipped: 0, merged: false };
	for (const entry of parseTar(tar)) {
		// GitHub archives wrap everything in a "<repo>-<sha>/" folder: drop that
		// first segment.
		const rel = entry.name.split("/").slice(1).join("/");
		if (!rel || rel.split("/").includes("..")) continue;
		if (SKIP.has(rel)) continue;

		const dest = path.join(target, rel);

		if (entry.type === "dir") {
			fs.mkdirSync(dest, { recursive: true });
			continue;
		}

		fs.mkdirSync(path.dirname(dest), { recursive: true });

		// package.json already there → deep merge (keep the existing project's
		// deps, add the template's).
		if (rel === "package.json" && fs.existsSync(dest)) {
			const existing = JSON.parse(fs.readFileSync(dest, "utf8"));
			const incoming = JSON.parse(entry.data.toString("utf8"));
			fs.writeFileSync(dest, JSON.stringify(deepMerge(existing, incoming), null, 2) + "\n");
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


// ─── package.json / kirigami.yaml ──────────────────────────────────────────

// Current @kirigami/cli version on the npm registry, or null (offline, or an
// unexpected answer). Uses the abbreviated per-version endpoint.
export async function latestCliVersion() {
	try {
		const res = await fetch("https://registry.npmjs.org/@kirigami%2fcli/latest", { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return null;
		const { version } = await res.json();
		return typeof version === "string" && /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version) ? version : null;
	} catch {
		return null;
	}
}

// Written when the template ships no package.json. Versions come from the
// installed packages; the CLI's own version is supplied by the caller (core
// can't see @kirigami/cli, see createProject()), else the "latest" dist-tag.
export function writeMinimalPackageJson(target, meta, { cliVersion } = {}) {
	const require = createRequire(import.meta.url);
	const core = require("../package.json");
	const canva = require("@kirigami/canva/package.json");
	const pkg = {
		name: meta.slug,
		version: "1.0.0",
		description: meta.description || "",
		author: meta.author || "",
		license: "MIT",
		type: "module",
		private: true,
		engines: { node: ">=24.0.0", npm: ">=10.2.3" },
		scripts: { build: "kiri build", watch: "kiri watch", export: "kiri export" },
		devDependencies: {
			"@kirigami/cli": cliVersion ? `^${cliVersion}` : "latest",
			"@kirigami/kirigami": `^${core.version}`,
			"@kirigami/canva": `^${canva.version}`,
		},
	};
	fs.writeFileSync(path.join(target, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
}

// A YAML plain scalar is fine unless it would be misread: empty, a leading
// indicator char, a `": "` / `" #"` sequence, edge whitespace, a bare bool/null,
// or something number-like. Then double-quote it.
function yamlScalar(v) {
	const bad = v === ""
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
export function setKirigamiKey(yaml, key, value) {
	const lines = yaml.split("\n");
	const start = lines.findIndex((l) => /^kirigami:\s*$/.test(l));
	if (start === -1) return yaml;

	let end = start + 1;
	while (end < lines.length && (lines[end].trim() === "" || /^\s/.test(lines[end]))) end++;

	const scalar = yamlScalar(value);
	const at = lines.findIndex((l, i) => i >= start && i < end && new RegExp(`^\\s+${key}:(\\s|$)`).test(l));

	if (at !== -1) {
		const keyIndent = lines[at].match(/^\s*/)[0].length;
		const rhs = lines[at].slice(lines[at].indexOf(":") + 1).trim();
		lines[at] = lines[at].replace(/^(\s+\S+:[ \t]*).*$/, `$1${scalar}`);
		// `description: >-` and friends: drop the folded/literal continuation.
		if (/^[|>][+-]?\d*$/.test(rhs)) {
			let n = at + 1;
			while (n < lines.length && lines[n].trim() !== "" && lines[n].match(/^\s*/)[0].length > keyIndent) n++;
			lines.splice(at + 1, n - at - 1);
		}
		return lines.join("\n");
	}

	// New key: copy the indent + value column from a sibling line.
	const sibling = lines.slice(start + 1, end).find((l) => /^(\s+)\S+:[ \t]+\S/.test(l));
	const m = sibling && sibling.match(/^(\s+)(\S+:)([ \t]+)/);
	const indent = m ? m[1] : "  ";
	const pad = m ? " ".repeat(Math.max(1, m[2].length + m[3].length - key.length - 1)) : " ";

	let insert = end;
	while (insert > start + 1 && lines[insert - 1].trim() === "") insert--;
	lines.splice(insert, 0, `${indent}${key}:${pad}${scalar}`);
	return lines.join("\n");
}

// Writes the metadata into package.json and kirigami.yaml. `fillOnly`: only
// set package.json keys that are currently missing/empty (grafting onto a
// project that already had its own package.json). Returns the changed keys.
export function applyMeta(target, meta, { fillOnly = false, created = false } = {}) {
	const changed = [];

	const pkgPath = path.join(target, "package.json");
	if (fs.existsSync(pkgPath)) {
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
		const set = (k, v) => {
			if (!v) return;
			if (fillOnly && pkg[k] && !(created && k === "name")) return;
			if (pkg[k] !== v) { pkg[k] = v; changed.push(k); }
		};
		set("name", meta.slug);
		set("description", meta.description);
		set("author", meta.author);
		fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
	}

	const yamlPath = path.join(target, "kirigami.yaml");
	if (fs.existsSync(yamlPath)) {
		let yaml = fs.readFileSync(yamlPath, "utf8");
		for (const [key, value] of [
			["project", meta.name], ["baseurl", meta.baseurl],
			["description", meta.description], ["author", meta.author],
			["email", meta.email], ["repo", meta.repo],
		]) {
			if (!value) continue;
			const next = setKirigamiKey(yaml, key, value);
			if (next !== yaml) { yaml = next; changed.push(key); }
		}
		fs.writeFileSync(yamlPath, yaml);
	}

	return [...new Set(changed)];
}

// Written when the template ships no banner.txt. The ### ### tokens are left in
// place — build/export fill them (date, project, author, email, repo, base
// URL) from the config every time. Points kirigami.yaml at it unless a
// `banner:` key is already there. Returns whether a banner was written.
export function writeStarterBanner(target) {
	const dest = path.join(target, "banner.txt");
	if (fs.existsSync(dest)) return false;
	fs.copyFileSync(new URL("../assets/banner-template.txt", import.meta.url), dest);

	const yamlPath = path.join(target, "kirigami.yaml");
	if (fs.existsSync(yamlPath)) {
		const yaml = fs.readFileSync(yamlPath, "utf8");
		if (!/^[ \t]+banner:/m.test(yaml)) {
			fs.writeFileSync(yamlPath, setKirigamiKey(yaml, "banner", "banner.txt"));
		}
	}
	return true;
}


// ─── git / npm ─────────────────────────────────────────────────────────────

function hasGit() {
	try { execFileSync("git", ["--version"], { stdio: "ignore" }); return true; }
	catch { return false; }
}

function insideGitWorktree(dir) {
	// The target may not exist yet: ask from its nearest existing ancestor.
	let cwd = path.resolve(dir);
	while (!fs.existsSync(cwd) && path.dirname(cwd) !== cwd) cwd = path.dirname(cwd);
	try {
		return execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd, stdio: ["ignore", "pipe", "ignore"] })
			.toString().trim() === "true";
	} catch { return false; }
}

// Whether createProject() would initialise a repository in `target`:
// { ok: true } or { ok: false, reason: "git-missing" | "inside-worktree" }.
// Lets an interface skip its "initialise git?" question when it's moot.
export function canInitGit(target) {
	if (!hasGit()) return { ok: false, reason: "git-missing" };
	if (insideGitWorktree(target)) return { ok: false, reason: "inside-worktree" };
	return { ok: true };
}

// Initialises a repository with one initial commit. A failed commit (no
// user.name / user.email) still leaves the repository: { initialised: true,
// committed: false, error }.
function gitInit(target, templateName) {
	const check = canInitGit(target);
	if (!check.ok) return { initialised: false, committed: false, skipped: check.reason };
	const git = (...args) => execFileSync("git", args, { cwd: target, stdio: ["ignore", "ignore", "pipe"] });
	try {
		git("init", "-q");
	} catch (err) {
		return { initialised: false, committed: false, error: firstLine(err) };
	}
	try {
		git("add", "-A");
		git("commit", "-q", "-m", `Initial commit from kiri create ${templateName}`);
		return { initialised: true, committed: true };
	} catch (err) {
		return { initialised: true, committed: false, error: firstLine(err) };
	}
}

function firstLine(err) {
	return String(err.stderr?.toString().trim() || err.message).split("\n")[0];
}

// Runs `npm install` in `target`. `stdio` as for child_process.spawn —
// "inherit" by default; a stdio-bound caller (an MCP server) must pass
// something that keeps npm off its stdout, e.g. ["ignore", 2, 2].
// Resolves { success, code, error? }; never rejects.
export function installDependencies(target, { stdio = "inherit" } = {}) {
	return spawnNpm(["install"], { cwd: path.resolve(target), stdio });
}


// ─── createProject ─────────────────────────────────────────────────────────

/**
 * Scaffolds a project from a template into `target`.
 *
 * options:
 *   template    template name ("blog" / "template-blog") or a listTemplates() entry
 *   target      destination directory (created if missing; default: cwd)
 *   meta        { name, description, author, email, baseurl, repo } — empty
 *               fields keep the template's values (see resolveMeta)
 *   git         initialise a repository + first commit (default true)
 *   cliVersion  @kirigami/cli version for a generated package.json (default:
 *               the registry's latest, else the "latest" dist-tag)
 *   onProgress  called with { step: "download", url } before downloading
 *
 * Resolves { success: true, template, target, archive, written, skipped,
 * merged, packageJson: "starter" | "template" | "merged" | "existing",
 * changed, banner, git } or { success: false, error }. Never throws for
 * expected failures (unknown template, network, git).
 */
export async function createProject({ template, target = process.cwd(), meta = {}, git = true, cliVersion, onProgress } = {}) {
	const dir = path.resolve(target);

	let tpl = template;
	if (!tpl) return { success: false, error: "Missing template name." };
	if (typeof tpl === "string") {
		try {
			tpl = await findTemplate(tpl);
		} catch (err) {
			return { success: false, error: `Cannot list templates: ${err.message}` };
		}
		if (!tpl) return { success: false, error: `Unknown template "${template}".` };
	}

	const before = inspectTarget(dir);
	const resolved = resolveMeta(dir, meta);

	const url = archiveUrl(tpl);
	await onProgress?.({ step: "download", url });
	let tar;
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
		tar = zlib.gunzipSync(Buffer.from(await res.arrayBuffer()));
	} catch (err) {
		return { success: false, error: `Download failed: ${err.message}` };
	}

	const { written, skipped, merged } = extractArchive(tar, dir);

	const pkgPath = path.join(dir, "package.json");
	let packageJson = before.hasPackageJson ? (merged ? "merged" : "existing") : "template";
	if (!fs.existsSync(pkgPath)) {
		// "latest" would stay in package.json and float across majors: pin a
		// caret range on the published CLI when the caller didn't supply one.
		writeMinimalPackageJson(dir, resolved, { cliVersion: cliVersion || await latestCliVersion() });
		packageJson = "starter";
	}
	const changed = applyMeta(dir, resolved, { fillOnly: before.hasPackageJson, created: packageJson === "starter" });
	const banner = writeStarterBanner(dir);

	const gitResult = git
		? gitInit(dir, tpl.template)
		: { initialised: false, committed: false, skipped: "disabled" };

	return {
		success: true,
		template: tpl.template,
		target: dir,
		archive: url,
		meta: resolved,
		written,
		skipped,
		merged,
		packageJson,
		changed,
		banner,
		git: gitResult,
	};
}
