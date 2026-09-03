import path from "path";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";
import { trigger } from "../libs/triggers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));


const HELP = {
	name: "build",
	description: "Compile the project for development (runs all configured tasks once, no minification/export step).",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Reads kirigami.yaml and runs every task declared under \"tasks\" (esbuild, sass, etc.) once, in order.",
		"If a \"prepros\" section is set, PHP templates are also rendered first (added as a forced task).",
		"Fires the \"before-build\" script trigger (see kiri run --help) before running the tasks.",
		"Only tasks whose type supports \"build\" run, unless the task sets \"force: true\".",
		"Output files are written relative to \"kirigami:root\"; use \"kiri export\" to bundle for production instead.",
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
		} else {
			process.stdout.write(` ${c.red("❌")}\n`);
			console.log(c.red("\n› Error:"));
			console.log(results.error);
			process.exit(1);
		}
	}
	
	console.log(`\n`);
	log.success(c.bold(c.green(` Build finished!`)));
	console.log();
}
