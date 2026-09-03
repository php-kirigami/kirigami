import path from "path";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";
import { trigger } from "../libs/triggers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __root = process.cwd();


const HELP = {
	name: "export",
	description: "Compile and export the project for production (forces all tasks + copies static files).",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Writes output to \"export:path\" in kirigami.yaml (defaults to \"dist\").",
		"Runs every task with \"force: true\", so build-only tasks (like \"dist\") also execute.",
		"If a \"prepros\" section is set, PHP templates are rendered first (added as a forced task).",
		"Fires the \"before-export\" then \"before-build\" script triggers before the tasks, and \"after-export\" once done (see kiri run --help).",
		"The banner defined in \"kirigami:banner\" (or an auto-generated one) is stamped on exported files.",
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

	const __dist = path.join(__root, config.export.path);

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);
	log.step(`Export    : ${c.dim(__dist)}`);

	console.log(`\n\n${c.bold('Tasks:')}`);

	await trigger('before-export');
	await trigger('before-build');

	config.tasks = [{
		name: "copy-files",
		type: "dist",
		force: true,
		path: __dist,
		...config.export,
	}, ...config.tasks];
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
	
	await trigger('after-export');
	
	console.log(`\n`);
	log.success(c.bold(c.green(` Export finished!`)));
	console.log();
}

