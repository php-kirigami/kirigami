import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { load } from "@kirigami/kirigami";

let __close = null;


const HELP = {
	name: "serve",
	description: "Dev-mode with hot-reload, plus a local server to preview it in a browser.",
	usage: "[options]",
	options: [
		{ flag: "--port, -p <n>", desc: "Port to listen on (default 4321, 0 for a random free port)" },
		{ flag: "--host <host>",  desc: "Host to bind to (default 127.0.0.1)" },
		{ flag: "--help, -h",     desc: "Show this help section" },
	],
	notes: [
		"Builds once before serving; an initial build failure stops startup.",
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

	const parsedPort = Number.parseInt(flags.port ?? flags.p, 10);
	const port = Number.isNaN(parsedPort) ? 4321 : parsedPort;
	const host = typeof flags.host === "string" ? flags.host : "127.0.0.1";

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

	// Same rules `kiri watch` builds — a rebuild just also tells open tabs to
	// reload, on top of whatever it already does to files on disk. A `sass`
	// rebuild swaps stylesheets in place (no reload); anything else (esbuild,
	// prepros) still does a full reload — safe either way, just not as smooth.
	const server = await project.serve({ port, host });

	console.log("\n");
	log.info(`Serving  : ${c.dim(server.url)} ${c.gray("(hot-reload on)")}`);
	log.info('Waiting for file change...\n');

	__close = server.close;
}


process.on("SIGINT", async () => {
	if (__close) {
		await __close();
	}
});
