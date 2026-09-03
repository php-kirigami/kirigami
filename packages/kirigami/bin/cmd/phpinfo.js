import { phpinfo as phpinfo_ } from "@kirigami/php-wasm";
import PHPInfoParser from "../libs/phpinfoparser.js";
import { parseArgs, printCommandHelp } from "../utils.js";


const HELP = {
	name: "phpinfo",
	description: "Print phpinfo() from the embedded PHP-WASM runtime used by Kirigami.",
	usage: "[options]",
	options: [
		{ flag: "--json", desc: "Output as JSON instead of Markdown" },
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
	const parser = PHPInfoParser.fromString(info);

	if (flags.json) {
		process.stdout.write(JSON.stringify(parser.toObject(), null, 2) + "\n");
		return;
	}

	const md = parser.toMarkdown();
	process.stdout.write(md);
}