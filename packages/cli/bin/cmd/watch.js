import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { load } from "@kirigami/kirigami";

let __close = null;


const HELP = {
	name: "watch",
	description: "Start dev-mode: watch project files and rebuild automatically on change.",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Builds once before watching; an initial build failure stops startup.",
		"Watches only tasks whose type supports it (esbuild, sass, prepros, …).",
		"Changes are debounced (150ms) and batched per task.",
		"node_modules/, .git/ and dist/ are always ignored; Ctrl+C stops cleanly.",
		"Rebuilds files on disk only — no server, no browser reload. For that, see `kiri serve`.",
	],
	examples: [
		"kiri watch",
	],
};


export default async function watch(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	console.log(`\n${c.bold(c.cyan("kiri"))} — Dev-mode with hot-reload\n`);
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

	const watcher = await project.watch();
	__close = watcher.close;
	console.log("\n");
	log.info('Waiting for file change...\n');
}


process.on("SIGINT", async () => {
	if (__close) {
		await __close();
	}
});
