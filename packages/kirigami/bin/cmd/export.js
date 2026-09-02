import path from "path";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";
import { runscript } from "./run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __root = process.cwd();


const HELP = {
	name: "export",
	description: "Compile and export project for production",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	examples: [
		"kiri export",
	],
};


export default async function exportDist(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	console.log(`\n${c.bold(c.cyan("kiri"))} — Export Project\n`);
	const config = await getConfig();

	if(!config.export?.path) {
		if(!config.export) config.export = {};
		config.export.path = 'dist';
	}

	const before = [];
	const after = [];
	if(config.scripts?.length) {
		config.scripts.forEach(s => {
			if(s.trigger == 'before') before.push(s);
			else if(s.trigger == 'after') after.push(s);
		});
	}

	const __dist = path.join(__root, config.export.path);

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);
	log.step(`Export    : ${c.dim(__dist)}`);

	if(before.length) {
		console.log(`\n\n${c.bold('Before export:')}`);
		for (const s of before) {
			process.stdout.write(`\n${c.gray("›")} Script: ${s.name}`);
			const results = await runscript(s.name);
			if(results.success) {
				process.stdout.write(` ${c.green("✔")}\n`);
				results.files.forEach(file => console.log(`    ${c.gray(file)}`));
			} else {
				process.stdout.write(` ${c.red("❌")}\n`);
				console.log(c.red("\n› Error:"));
				console.log(results.error);
				process.exit(1);
			}
		}
	}


	console.log(`\n\n${c.bold('Tasks:')}`);
	config.tasks = [{
		name: "copy-files",
		type: "dist",
		path: __dist,
		...config.export,
	}, ...config.tasks];
	if(config.prepros) {
		const task = {
			name: "prepros",
			type: "php",
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
		task.banner = config.kirigami.banner;
		process.stdout.write(`\n${c.gray("›")} ${modules[task.type].taskname}: ${task.name}`);
		const results = await modules[task.type].default(config.root, task, __dist);

		if(results.success) {
			process.stdout.write(` ${c.green("✔")}\n`);
			results.files.forEach(file => console.log(`    ${c.gray(file)}`));
		} else {
			process.stdout.write(` ${c.red("❌")}\n`);
			console.log(c.red("\n› Error:"));
			console.log(results.error);
			process.exit(1);
		}
	}

	if(after.length) {
		console.log(`\n\n${c.bold('After export:')}`);
		for (const s of after) {
			process.stdout.write(`\n${c.gray("›")} Script: ${s.name}`);
			const results = await runscript(s.name);
			if(results.success) {
				process.stdout.write(` ${c.green("✔")}\n`);
				results.files.forEach(file => console.log(`    ${c.gray(file)}`));
			} else {
				process.stdout.write(` ${c.red("❌")}\n`);
				console.log(c.red("\n› Error:"));
				console.log(results.error);
				process.exit(1);
			}
		}
	}

	console.log(`\n`);
	log.success(c.bold(c.green(` Export finished!`)));
	console.log();
}

