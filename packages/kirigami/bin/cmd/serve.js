import path from "path";
import { fileURLToPath } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";
import { loadPlugins } from "../libs/plugins.js";
import { buildWatchRules, createWatchers } from "../libs/watchengine.js";
import { createDevServer, logServerReady } from "../libs/devserver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let __close = null;


const HELP = {
	name: "serve",
	description: "Dev-mode with hot-reload, plus a local server to preview it in a browser.",
	usage: "[options]",
	options: [
		{ flag: "--port, -p <n>", desc: "Port to listen on (default 4321)" },
		{ flag: "--host <host>",  desc: "Host to bind to (default 127.0.0.1)" },
		{ flag: "--help, -h",     desc: "Show this help section" },
	],
	notes: [
		"Everything `kiri watch` does, plus: serves `kirigami.root` as static files",
		"and reloads any open tab after a rebuild (Server-Sent Events, no WebSocket lib).",
		"A plain rebuild-files-only workflow (no browser) is `kiri watch`.",
		"node_modules/, .git/ and dist/ are always ignored; Ctrl+C stops both cleanly.",
	],
	examples: [
		"kiri serve",
		"kiri serve --port 5000",
	],
};


export default async function serve(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	const port = Number.parseInt(flags.port ?? flags.p, 10) || 4321;
	const host = typeof flags.host === "string" ? flags.host : "127.0.0.1";

	console.log(`\n${c.bold(c.cyan("kiri"))} — Dev-mode with hot-reload\n`);
	const config = await getConfig();

	if (!config.export?.path) {
		if (!config.export) config.export = {};
		config.export.path = 'dist';
	}

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);

	await loadPlugins();

	const devserver = await createDevServer({ root: config.root, port, host });

	console.log("\n");
	logServerReady(devserver.url);
	log.info('Waiting for file change...\n');

	// Same rules `kiri watch` builds — a rebuild just also tells open tabs to
	// reload, on top of whatever it already does to files on disk.
	const rules = await buildWatchRules(config, __dirname);
	const watchers = rules.map((rule) => ({
		...rule,
		callback: async (...cbArgs) => {
			await rule.callback(...cbArgs);
			devserver.broadcastReload();
		},
	}));

	const { close } = createWatchers(watchers);
	__close = async () => {
		await close();
		await devserver.close();
	};
}


process.on("SIGINT", async () => {
	if (__close) {
		await __close();
	}
});
