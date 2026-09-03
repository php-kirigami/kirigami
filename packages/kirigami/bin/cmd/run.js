import fs from 'fs';
import path from "path";
import { c, log, parseArgs, printCommandHelp, findFiles } from "../utils.js";
import { getConfig } from "../config.js";
import { runenv } from '@kirigami/php-prepros';


const __root = process.cwd();

const HELP = {
	name: "run",
	description: "Run a PHP command script from the scripts/ folder, inside the Kirigami PHP runtime.",
	usage: "<script> [subcommand] [params...] [options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"The script file must exist at scripts/<script>.php relative to the project root.",
		"Any extra words after <script> are forwarded as positional arguments ($argv) to the PHP script.",
		"Declare a \"scripts\" entry in kirigami.yaml with a matching \"mount\" list to expose extra files/globs to the PHP runtime.",
		"A script can also run automatically by declaring \"trigger: before-build\" (or before-export / after-export) in kirigami.yaml.",
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
	const config = await getConfig();

	const file = path.join(__root, 'scripts', `${command}.php`);
	if(!fs.existsSync(file)) throw `Command "${command}" not found.`

	const argv = [
		...(subcommand ? [subcommand] : []),
		...positional
	];
	
	log.step(`Command    : ${c.dim(command)}`);
	if(argv.length) log.step(`Parameters : ${c.dim(argv)}`);

	const result = await runscript(command, argv);

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


export async function runscript(command, argv = []) {
	const config = await getConfig();
	
	const file = path.join(__root, 'scripts', `${command}.php`);
	if(!fs.existsSync(file)) throw `Command "${command}" not found.`

	const mountpaths = [];
	if(config.scripts?.length) {
		config.scripts.forEach(job => {
			if(job.name == command && job.mount?.length) {
				job.mount.forEach(pattern => findFiles(pattern).forEach(file => mountpaths.push(path.resolve(__root, file))));
			}
		});
	}

	const results = await runenv(file, mountpaths, ...argv);
	if(!results.files) results.files = [];
	return results;
}