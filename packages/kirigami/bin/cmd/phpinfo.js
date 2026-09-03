import { parseArgs, printCommandHelp } from "../utils.js";
import { phpinfo as phpinfo_ } from "@kirigami/php-wasm";
import PHPInfoParser from "../libs/phpinfoparser.js";


const HELP = {
	name: "phpinfo",
	description: "Print phpinfo() from the embedded PHP-WASM runtime used by Kirigami.",
	usage: "[options]",
	options: [
		{ flag: "--md, -h", desc: "Output as Markdown instead of HTML" },
		{ flag: "--json, -j", desc: "Output as JSON instead of HTML" },
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Output is written to stdout, so it can be redirected: kiri phpinfo > phpinfo.md",
		"Useful to inspect which PHP extensions/version are available inside the sandboxed runtime.",
	],
	examples: [
		"kiri phpinfo",
		"kiri phpinfo --json > phpinfo.json",
	],
};


export default async function phpinfo(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	const info = await phpinfo_();

	if (flags.json || flags.j) {
		const parser = PHPInfoParser.fromString(info);
		process.stdout.write(JSON.stringify(parser.toKeyValue(), null, 2) + "\n");
		return;
	}

	if (flags.md || flags.m) {
		const parser = PHPInfoParser.fromString(info);
		const md = parser.toMarkdown();
		process.stdout.write(md);
		return;
	}

	process.stdout.write(info);
}