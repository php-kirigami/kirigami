import path from "path";
import { fileURLToPath } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";
import { loadPlugins } from "../libs/plugins.js";
import { buildWatchRules, createWatchers } from "../libs/watchengine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let __close = null;


const HELP = {
	name: "watch",
	description: "Start dev-mode: watch project files and rebuild automatically on change.",
	usage: "[options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
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
	const config = await getConfig();

	if(!config.export?.path) {
		if(!config.export) config.export = {};
		config.export.path = 'dist';
	}

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);
	console.log("\n");
	log.info('Waiting for file change...\n');

	await loadPlugins();

	const watchers = await buildWatchRules(config, __dirname);
	const { close } = createWatchers(watchers);
	__close = close;
}


process.on("SIGINT", async () => {
	if(__close) {
		await __close();
	}
});
