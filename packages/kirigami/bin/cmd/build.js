import path from "path";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp, printTaskError } from "../utils.js";
import { getConfig } from "../config.js";
import { trigger } from "../libs/triggers.js";
import { loadPlugins } from "../libs/plugins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const HELP = {
	name: "build",
	description: "Compile the project for development (runs all configured tasks once, no minification/export step).",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Runs every task under \"tasks:\" once, in order; PHP templates render first when \"prepros:\" is set.",
		"Fires the \"before-build\" trigger first (see kiri run --help).",
		"Skips tasks with no build step unless they set \"force: true\".",
		"Output goes under \"kirigami:root\" — use kiri export for production.",
	],
	examples: [
		"kiri build",
	],
};


export default async function build(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	console.log(`\n${c.bold(c.cyan("kiri"))} — Build Project\n`);
	const config = await getConfig();

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);
	await loadPlugins();

	console.log(`\n\n${c.bold('Tasks:')}`);

	await trigger('before-build');

	if(config.prepros) {
		const task = {
			name: "render-all",
			type: "prepros",
			force: true,
			config: config.prepros,
		};
		config.tasks = [ task, ...config.tasks];
	}

	const modules = [];
	for (const task of config.tasks) {
		if(!modules[task.type]) {
			const taskPath = path.resolve(__dirname, "../tasks", `${task.type}.js`);
			modules[task.type] = await import(pathToFileURL(taskPath).href);
		}
		if(!task.force && !modules[task.type].canbuild) continue;
		process.stdout.write(`\n${c.gray("›")} ${modules[task.type].taskname}: ${task.name}`);
		const results = await modules[task.type].default(config.root, task);
		if(results.success) {
			process.stdout.write(` ${c.green("✔")}\n`);
			results.files.forEach(file => console.log(`    ${c.gray(file)}`));
			if(results.warnings) {
				console.log(c.yellow("\n› Warnings:"));
				console.log(c.dim(results.warnings));
			}
		} else {
			process.stdout.write(` ${c.red("❌")}\n`);
			printTaskError(results);
			process.exit(1);
		}
	}
	
	console.log(`\n`);
	log.success(c.bold(c.green(` Build finished!`)));
	console.log();
}
