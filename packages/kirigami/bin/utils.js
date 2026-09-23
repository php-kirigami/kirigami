import fs from 'fs';
import path from "path";
import picomatch from "picomatch";
/**
 * bin/utils.js — Engine-side helpers used by config.js, the task modules,
 * and (re-exported) @kirigami/cli's commands.
 *
 * Interactive-terminal-only helpers (prompts, arg parsing, --help rendering)
 * moved to @kirigami/cli's own bin/utils.js on the core-api split — those
 * have no business in the engine. `c`/`log`/`printTaskError` stayed here
 * instead of moving with them: the task modules (tasks/sass.js, esbuild.js,
 * prepros.js) print their own warnings inline during a real build (e.g. a
 * non-fatal PHP warning) regardless of who's driving the build, so this
 * package can't be without them. @kirigami/cli re-exports these from
 * "@kirigami/kirigami/internal/utils" rather than duplicating them, so its
 * own bin/cmd/*.js can keep importing everything from one "../utils.js".
 *
 * Known gap (see todo.md): this means a task module can still write directly
 * to the host process's console even when driven through the programmatic
 * Project API (an embedder can't fully suppress it) — pre-existing behavior,
 * not something this split introduced or fixes.
 */

// ─── ANSI colors (zero-dep) ─────────────────────────────────────────────────
// Only for a terminal: a pipe (the VS Code extension's output channel, a CI
// log, a file) gets plain text. NO_COLOR (https://no-color.org) turns colors
// off, FORCE_COLOR (other than "0") turns them on regardless.
const useColor = !process.env.NO_COLOR && (process.env.FORCE_COLOR
	? process.env.FORCE_COLOR !== "0"
	: Boolean(process.stdout?.isTTY));
const paint = (code) => (useColor ? (s) => `\x1b[${code}m${s}\x1b[0m` : (s) => `${s}`);

export const c = {
	bold: paint(1),
	dim: paint(2),
	cyan: paint(36),
	green: paint(32),
	yellow: paint(33),
	red: paint(31),
	gray: paint(90),
	magenta: paint(35),
};

// ─── Logger ──────────────────────────────────────────────────────────────────
export const log = {
	info: (...a) => console.log(c.cyan("ℹ "), ...a),
	success: (...a) => console.log(c.green("✔"), ...a),
	warn: (...a) => console.warn(c.yellow("⚠"), ...a),
	error: (...a) => console.error(c.red("❌"), ...a),
	step: (...a) => console.log(c.gray("›"), ...a),
};


// ─── Task-failure reporter ─────────────────────────────────────────────────
/**
 * Prints a task result whose `success` is false in a readable way: the
 * message, the page/location it came from, and — folded and dimmed — the raw
 * PHP stderr and stdout when they carry more detail. Every task result flows
 * through here so a failure is never just "undefined".
 */
export function printTaskError(results = {}) {
	const msg = results.error || results.message || results.stderr || "Unknown error (no message returned).";
	console.log(c.red("\n› Error:"));
	console.log(`  ${msg}`);
	if (results.page)  console.log(c.dim(`  page:  ${results.page}`));
	if (results.where) console.log(c.dim(`  at:    ${results.where}`));

	const extra = [];
	if (results.stderr && results.stderr !== msg) extra.push(["stderr", results.stderr]);
	if (results.debug && String(results.debug).trim()) extra.push(["debug", results.debug]);
	for (const [label, body] of extra) {
		const text = String(body).trim();
		if (!text) continue;
		const lines = text.split("\n");
		const shown = lines.slice(-40).join("\n");
		console.log(c.dim(`\n  ── ${label}${lines.length > 40 ? ` (last 40 of ${lines.length} lines)` : ""} ──`));
		console.log(c.dim(shown.replace(/^/gm, "  ")));
	}
}


export const replaceRoot = (path) => {
	const __root = process.cwd();
	return path
		.replace(__root, '')
		.replace(/\\/g, '/')
		.replace(/^\//, '')
	;
}



export function joinWith(part1, part2, separator = '/', prefix = '') {
	let join = '';
	let separatorsFound = 0;
	if (part1.endsWith(separator)) { separatorsFound += 1; }
	if (part2.startsWith(separator)) { separatorsFound += 1; }
	if (separatorsFound === 0) { join = separator; }
	else if (separatorsFound === 2) { part1 = part1.substr(0, part1.length - separator.length); }
	if (part1.startsWith(prefix)) { prefix = ''; }
	return prefix + part1 + join + part2;
}


// English long date + 24h time, in the local timezone — e.g.
// "Thursday, September 10, 2026 at 20:04". Used for the export banner's
// ###DATE### token.
export function formatDate(dateInput = new Date()) {
	const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
	const fmt = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
	});
	const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
	return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year} at ${parts.hour}:${parts.minute}`;
}



export function findFiles(pattern, cwd = process.cwd()) {
	const isMatch = picomatch(pattern);
	const results = [];
	function walk(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const relativePath = path.relative(cwd, fullPath);
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				walk(fullPath);
			} else if (entry.isFile()) {
				if (isMatch(relativePath.split(path.sep).join('/'))) {
					results.push(relativePath.replaceAll('\\', '/'));
				}
			}
		}
	}
	walk(cwd);
	return results;
}