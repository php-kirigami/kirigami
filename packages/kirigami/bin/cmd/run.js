import fs from 'fs';
import path from "path";
import { c, log, parseArgs, printCommandHelp, findFiles } from "../utils.js";
import { getConfig } from "../config.js";
import { runenv } from '@kirigami/php-prepros';


const __root = process.cwd();

const HELP = {
	name: "run",
	description: "Run PHP command script. PHP files needs to be in scripts/ folder.",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	examples: [
		"kiri run before-export param1 param2",
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