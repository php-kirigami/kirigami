#!/usr/bin/env node

import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { existsSync } from "fs";
import { c } from "./utils.js";
import { phpversion } from "@kirigami/php-wasm";
import { getCommand } from "@kirigami/sdk";
import { load } from "@kirigami/kirigami";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Available subcommands ─────────────────────────────────────────────────
const COMMANDS = {
	build: "Compile project for development",
	export: "Compile and export project for production",
	watch: "Start dev-mode with hot-reload",
	serve: "Dev-mode with hot-reload, served locally in a browser",
	run: "Run a PHP command script from the scripts/ folder",
	mcp: "Serve this project over MCP (stdio) for an AI agent",
	create: "Create a new project from an official template",
	install: "Install a plugin and print its kirigami.yaml options",
	cache: "Purge the local caches (.node.db / .cache.db / .cookie.txt)",
	phpinfo: "Print phpinfo() from the embedded PHP-WASM runtime",
};

// ─── Global help ───────────────────────────────────────────────────────────
function printHelp() {
	console.log(`
██╗  ██╗██╗██████╗ ██╗ ██████╗  █████╗ ███╗   ███╗██╗
██║ ██╔╝██║██╔══██╗██║██╔════╝ ██╔══██╗████╗ ████║██║
█████╔╝ ██║██████╔╝██║██║  ███╗███████║██╔████╔██║██║
██╔═██╗ ██║██╔══██╗██║██║   ██║██╔══██║██║╚██╔╝██║██║
██║  ██╗██║██║  ██║██║╚██████╔╝██║  ██║██║ ╚═╝ ██║██║
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝`);
	console.log(`
${c.bold(c.cyan("kiri"))} ${c.dim("— Kirigami CLI")}

${c.bold("USAGE")}
  ${c.cyan("kiri")} ${c.green("<command>")} [options]

${c.bold("COMMANDS")}
${Object.entries(COMMANDS)
			.map(([cmd, desc]) => `  ${c.green(cmd.padEnd(12))}${c.dim(desc)}`)
			.join("\n")}

${c.bold("GLOBAL OPTIONS")}
  ${c.gray("--help, -h")}    Show help
  ${c.gray("--version, -v")} Show version

${c.bold("EXAMPLES")}
  ${c.dim("kiri build")}
  ${c.dim("kiri export")}
  ${c.dim("kiri watch")}
  ${c.dim("kiri serve")}
  ${c.dim("kiri run convert-images")}
  ${c.dim("kiri mcp")}
  ${c.dim("kiri create --list")}
  ${c.dim("kiri install @kirigami/plugin-highlight")}
  ${c.dim("kiri cache purge")}

${c.dim("Type `kiri <command> --help` for detailed help on a command.")}
`);
}

// ─── Version ───────────────────────────────────────────────────────────────
async function printVersion() {
	const { createRequire } = await import("module");
	const require = createRequire(import.meta.url);
	const pkg = require("../package.json");
	const php_version = await phpversion();

	console.log("");
	console.log(`${c.cyan("kiri:")} v${pkg.version}`);
	console.log(`${c.cyan("php: ")} v${php_version}`);
}

// ─── Dispatcher ────────────────────────────────────────────────────────────
async function main() {
	const args = process.argv.slice(2);
	const [subcommand, ...rest] = args;

	// Global flags
	if (!subcommand || subcommand === "--help" || subcommand === "-h") {
		printHelp();
		process.exit(0);
	}

	if (subcommand === "--version" || subcommand === "-v") {
		await printVersion();
		process.exit(0);
	}

	// Resolve the command file
	const cmdPath = resolve(__dirname, "cmd", `${subcommand}.js`);

	try {
		if (existsSync(cmdPath)) {
			const cmdModule = await import(pathToFileURL(cmdPath).href);
			await cmdModule.default(rest);
			return;
		}

		// Not a built-in command — a plugin may have registered it (a package
		// declaring `"kirigami": { "type": "command" }`, see @kirigami/sdk's
		// commands.js). Loading the project runs every plugin's register(),
		// which is what actually populates that registry — same cost `build`/
		// `serve`/etc. already pay, just paid here instead. Only a failure to
		// *load* falls through to "unknown command" below (no kirigami.yaml
		// here, or it's invalid) — a found command's own run() failing is a
		// real error and propagates normally, it isn't "unknown".
		let project = null;
		try {
			project = await load();
		} catch { /* no project here (or invalid) — command falls through as unknown */ }

		const plugin = project && getCommand(subcommand);
		if (plugin) {
			await plugin.run(rest, project);
			return;
		}

		console.error(
			`\n${c.red("❌")} Unknown command : ${c.bold(subcommand)}\n` +
			`  Type ${c.cyan("kiri --help")} to see avaiable commands.\n`
		);
		process.exit(1);
	} catch (err) {
		console.error(`\n${c.red("❌")} Error: ${c.bold(subcommand)} failed:\n  ${typeof err == 'string' ? err : err.message}\n`);
		process.exit(1);
	}
}

await main();