import { c, log, parseArgs, printCommandHelp, printTaskError } from "../utils.js";
import { load } from "@kirigami/kirigami";


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

	const result = await project.build();

	for (const scriptResult of result.trigger.results) {
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

	if (!result.success) process.exit(1);

	console.log(`\n`);
	log.success(c.bold(c.green(` Build finished!`)));
	console.log();
}
