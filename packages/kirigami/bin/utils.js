/**
 * bin/utils.js — Utilitaires partagés entre toutes les sous-commandes
 */

// ─── Couleurs ANSI (zero-dep) ────────────────────────────────────────────────
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

// ─── Parser d'arguments minimaliste ─────────────────────────────────────────
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

// ─── Aide par commande ───────────────────────────────────────────────────────
export function printCommandHelp({ name, description, usage, options = [], examples = [] }) {
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

	if (examples.length) {
		console.log(c.bold("EXEMPLES"));
		examples.forEach((ex) => console.log(`  ${c.dim(ex)}`));
		console.log();
	}
}


export const replaceRoot = (path) => {
	const __root = process.cwd();
	return path
		.replace(__root, '')
		.replace(/\\/g, '/')
		.replace(/\//, '')
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