import path from "path";
import { c, log, parseArgs, printCommandHelp, printTaskError } from "../utils.js";
import { getConfig } from "@kirigami/kirigami/internal/config";
import { loadPlugins } from "@kirigami/kirigami/internal/plugins";
import { trigger } from "../libs/triggers.js";

const __root = process.cwd();


const HELP = {
	name: "export",
	description: "Compile and export the project for production (forces all tasks + copies static files).",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Writes to \"export:path\" (default \"dist\").",
		"Runs every task with \"force: true\", so build-only tasks (e.g. \"dist\") also run; PHP renders first when \"prepros:\" is set.",
		"Triggers: \"before-export\" → \"before-build\" before, \"after-export\" after (see kiri run --help).",
		"Stamps \"kirigami:banner\" (or an auto one) on exported files.",
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

	const loadedPlugins = await loadPlugins(config);
	if (loadedPlugins.length) {
		console.log(`\n${c.bold("Plugins:")}`);
		loadedPlugins.forEach(({ name, version }) =>
			log.step(`${c.green("✔")} ${name}${version ? c.dim(` v${version}`) : ""}`));
	}

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
			modules[task.type] = await import(`@kirigami/kirigami/internal/tasks/${task.type}`);
		}
		if(!task.force && !modules[task.type].canbuild) continue;
		task.banner = config.kirigami.banner;
		process.stdout.write(`\n${c.gray("›")} ${modules[task.type].taskname}: ${task.name}`);
		const results = await modules[task.type].default(config.root, task, __dist);

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
	
	await trigger('after-export');
	
	console.log(`\n`);
	log.success(c.bold(c.green(` Export finished!`)));
	console.log();
}

