import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { load } from "@kirigami/kirigami";

const HELP = {
	name: "run",
	description: "Run a PHP command script from the scripts/ folder, inside the Kirigami PHP runtime.",
	usage: "<script> [subcommand] [params...] [options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Needs scripts/<script>.php at the project root, or a script an active plugin registered.",
		"Extra words after <script> become $argv for the PHP script.",
		"Expose more files via a \"scripts:\" entry with a \"mount:\" list in kirigami.yaml.",
		"A script with \"trigger: before-build\" (or before-/after-export) runs automatically.",
	],
	examples: [
		"kiri run before-export",
		"kiri run before-export param1 param2",
		"kiri run deploy production --force",
	],
};


export default async function run(args) {
	const { command, subcommand, flags, positional } = parseArgs(args);

	if (flags.help || flags.h || !command) {
		printCommandHelp(HELP);
		return;
	}

	console.log(`\n${c.bold(c.cyan("kiri"))} — Run PHP command script\n`);
	const project = await load(); // fails fast on an invalid kirigami.yaml before touching the PHP runtime

	const argv = [
		...(subcommand ? [subcommand] : []),
		...positional
	];

	log.step(`Command    : ${c.dim(command)}`);
	if(argv.length) log.step(`Parameters : ${c.dim(argv)}`);

	const result = await project.run(command, argv);

	if(result.success) log.step(`Execution  : ${c.dim('Success ✔')}`);
	else {
		log.step(`Execution  : ${c.dim('Error ❌')}`);
		if(result.error) log.step(`Error      : ${c.dim(result.error)}`);
	}

	if(result.files?.length) {
		console.log("");
		log.step(`Exported files:`);
		result.files.forEach(file => console.log(`    ${c.gray(file)}`));
	}

	if(result.debug) {
		console.log("");
		log.step(`Output debug:`);
		result.debug.split('\n').forEach(line => console.log(`    ${c.gray(line)}`));
	}

	if(!result.success) process.exit(1);

}