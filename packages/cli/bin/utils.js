/**
 * bin/utils.js — Terminal-presentation helpers shared by every `kiri`
 * subcommand: interactive prompts, arg parsing, and the `--help` renderer.
 *
 * `c`/`log`/`printTaskError` are re-exported from @kirigami/kirigami's own
 * bin/utils.js rather than duplicated here — the engine's task modules print
 * through the same `c`/`log` while running a build (see that file's doc
 * comment for why), so this just re-exports the same instances instead of
 * keeping two independent copies. Engine-only helpers (formatDate, findFiles,
 * replaceRoot, joinWith) aren't re-exported — a command that needs one of
 * those imports "@kirigami/kirigami/internal/utils" directly.
 */

import { createInterface } from 'node:readline/promises';

export { c, log, printTaskError } from "@kirigami/kirigami/internal/utils";
import { c, log } from "@kirigami/kirigami/internal/utils";

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
