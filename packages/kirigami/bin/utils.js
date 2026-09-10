import fs from 'fs';
import path from "path";
import picomatch from "picomatch";
import { createInterface } from 'node:readline/promises';
/**
 * bin/utils.js — Shared helpers used by every subcommand
 */

// ─── ANSI colors (zero-dep) ─────────────────────────────────────────────────
export const c = {
	bold: (s) => `\x1b[1m${s}\x1b[0m`,
	dim: (s) => `\x1b[2m${s}\x1b[0m`,
	cyan: (s) => `\x1b[36m${s}\x1b[0m`,
	green: (s) => `\x1b[32m${s}\x1b[0m`,
	yellow: (s) => `\x1b[33m${s}\x1b[0m`,
	red: (s) => `\x1b[31m${s}\x1b[0m`,
	gray: (s) => `\x1b[90m${s}\x1b[0m`,
	magenta: (s) => `\x1b[35m${s}\x1b[0m`,
};

// ─── Logger ──────────────────────────────────────────────────────────────────
export const log = {
	info: (...a) => console.log(c.cyan("ℹ "), ...a),
	success: (...a) => console.log(c.green("✔"), ...a),
	warn: (...a) => console.warn(c.yellow("⚠"), ...a),
	error: (...a) => console.error(c.red("❌"), ...a),
	step: (...a) => console.log(c.gray("›"), ...a),
};

// ─── Interactive prompts (TTY only) ────────────────────────────────────────
// Small zero-dep wrappers over node:readline/promises. A fresh interface per
// call keeps them independent — fine for the handful of questions `kiri create`
// asks. Callers must gate on `isInteractive()` first: in a pipe / CI these
// would hang.
export const isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

export async function ask(question, { default: def = '' } = {}) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	try {
		const hint = def ? c.dim(` [${def}]`) : '';
		const answer = (await rl.question(`${c.cyan('?')} ${question}${hint} `)).trim();
		return answer || def;
	} finally {
		rl.close();
	}
}

export async function confirm(question, def = true) {
	const answer = (await ask(`${question} ${c.dim(def ? '(Y/n)' : '(y/N)')}`)).toLowerCase();
	if (!answer) return def;
	return answer === 'y' || answer === 'yes';
}

// choices: [{ value, label, hint? }]. Returns the picked `value`.
export async function select(question, choices) {
	const width = String(choices.length).length;
	console.log(`${c.cyan('?')} ${question}`);
	choices.forEach((ch, i) => {
		console.log(`  ${c.cyan(String(i + 1).padStart(width))}  ${ch.label}${ch.hint ? c.dim(`  ${ch.hint}`) : ''}`);
	});
	for (;;) {
		const raw = await ask(`${c.dim(`1-${choices.length} or name`)}`);
		const n = Number.parseInt(raw, 10);
		if (n >= 1 && n <= choices.length) return choices[n - 1].value;
		const named = choices.find((ch) => ch.value === raw);
		if (named) return named.value;
		if (raw) log.warn(`"${raw}" — pick a number 1-${choices.length} or a name.`);
	}
}

// ─── Minimal argument parser ────────────────────────────────────────────────
/**
 * parseArgs(["--port", "3000", "--minify", "src/"])
 * → { flags: { port: "3000", minify: true }, positional: ["src/"] }
 */
export function parseArgs(args = []) {
	const flags = {};
	const positional = [];
	let command = null;
	let subcommand = null;
	let i = 0;

	while (i < args.length) {
		const arg = args[i];

		if (arg.startsWith("--")) {
			const key = arg.slice(2);
			const next = args[i + 1];
			if (next && !next.startsWith("--") && !next.startsWith("-")) {
				flags[key] = next;
				i += 2;
			} else {
				flags[key] = true;
				i++;
			}
		} else if (arg.startsWith("-") && arg.length === 2) {
			flags[arg.slice(1)] = true;
			i++;
		} else if (command === null) {
			command = arg;
			i++;
		} else if (subcommand === null) {
			subcommand = arg;
			i++;
		} else {
			positional.push(arg);
			i++;
		}
	}

	return { command, subcommand, flags, positional };
}

// ─── Per-command help ──────────────────────────────────────────────────────
export function printCommandHelp({ name, description, usage, options = [], notes = [], examples = [] }) {
	console.log(`
${c.bold(c.cyan(`kiri ${name}`))} — ${c.dim(description)}

${c.bold("USAGE")}
  ${c.cyan(`kiri ${name}`)} ${usage ?? ""}
`);

	if (options.length) {
		console.log(c.bold("OPTIONS"));
		options.forEach(({ flag, desc }) =>
			console.log(`  ${c.gray(flag.padEnd(22))}${desc}`)
		);
		console.log();
	}

	if (notes.length) {
		console.log(c.bold("NOTES"));
		notes.forEach((note) => console.log(`  ${c.dim("•")} ${note}`));
		console.log();
	}

	if (examples.length) {
		console.log(c.bold("EXAMPLES"));
		examples.forEach((ex) => console.log(`  ${c.dim(ex)}`));
		console.log();
	}
}


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


export function formatFrDate(dateInput = new Date()) {
	const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
	const fmt = new Intl.DateTimeFormat('fr-CA', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		hour12: false,
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
	});
	const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
	const weekday = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
	return `${weekday} le ${parts.day} ${parts.month} ${parts.year} à ${parts.hour} h ${parts.minute}`;
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