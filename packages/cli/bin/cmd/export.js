import { c, log, parseArgs, printCommandHelp, printTaskError } from "../utils.js";
import { load } from "@kirigami/kirigami";


function printTriggerResults(trigger) {
	if (!trigger) return;
	for (const scriptResult of trigger.results) {
		process.stdout.write(`\n${c.gray("›")} SCRIPT: ${scriptResult.name}`);
		if (scriptResult.success) {
			process.stdout.write(` ${c.green("✔")}\n`);
			scriptResult.files?.forEach(file => console.log(`    ${c.gray(file)}`));
		} else {
			process.stdout.write(` ${c.red("❌")}\n`);
			console.log(c.red("\n› Error:"));
			console.log(scriptResult.error);
		}
	}
}


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
	const project = await load();
	const { config } = project;

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);

	if (project.plugins.length) {
		console.log(`\n${c.bold("Plugins:")}`);
		project.plugins.forEach(({ name, version }) =>
			log.step(`${c.green("✔")} ${name}${version ? c.dim(` v${version}`) : ""}`));
	}

	console.log(`\n\n${c.bold('Tasks:')}`);

	const result = await project.export();

	log.step(`Export    : ${c.dim(result.dist)}`);

	printTriggerResults(result.beforeExport);
	printTriggerResults(result.beforeBuild);

	for (const taskResult of result.results) {
		process.stdout.write(`\n${c.gray("›")} ${taskResult.taskname}: ${taskResult.task}`);
		if (taskResult.success) {
			process.stdout.write(` ${c.green("✔")}\n`);
			taskResult.files?.forEach(file => console.log(`    ${c.gray(file)}`));
			if (taskResult.warnings) {
				console.log(c.yellow("\n› Warnings:"));
				console.log(c.dim(taskResult.warnings));
			}
		} else {
			process.stdout.write(` ${c.red("❌")}\n`);
			printTaskError(taskResult);
		}
	}

	printTriggerResults(result.afterExport);

	if (!result.success) process.exit(1);

	console.log(`\n`);
	log.success(c.bold(c.green(` Export finished!`)));
	console.log();
}

