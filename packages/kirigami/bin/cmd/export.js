/**
 * kiri export [--format <fmt>] [--outdir <path>]
 *
 * Exporte le projet compilé dans différents formats.
 */

import path from "path";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __root = process.cwd();



const FORMATS = ["zip", "static", "docker", "gh-pages"];

const HELP = {
	name: "export",
	description: "Exporter le projet",
	usage: "[options]",
	options: [
		{ flag: `--format, -f <fmt>`, desc: `Format de sortie : ${FORMATS.join(", ")} (défaut: static)` },
		{ flag: "--outdir <path>", desc: "Dossier de sortie (défaut: ./export)" },
		{ flag: "--no-build", desc: "Ignorer l'étape de build (utilise ./dist existant)" },
		{ flag: "--help, -h", desc: "Afficher cette aide" },
	],
	examples: [
		"kiri export",
		"kiri export --format zip",
		"kiri export --format gh-pages --no-build",
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
		log.error(` Missing export.path configuration in config file.`);
		process.exit(1);
	}

	const __dist = path.join(__root, config.export.path);

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);
	log.step(`Export    : ${c.dim(__dist)}`);
	
	console.log(`\n\n${c.bold('Tasks:')}`);

	config.tasks = [{
		name: "copy-files",
		type: "dist",
		...config.export,
		path: __dist,
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
	console.log(`\n`);
	log.success(c.bold(c.green(` Export finished!`)));
	console.log();
}

