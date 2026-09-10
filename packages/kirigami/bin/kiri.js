#!/usr/bin/env node

import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { existsSync } from "fs";
import { c } from "./utils.js";
import { phpversion } from "@kirigami/php-wasm";

const __dirname = dirname(fileURLToPath(import.meta.url));


// ─── Available subcommands ─────────────────────────────────────────────────
const COMMANDS = {
	build: "Compile project for development",
	export: "Compile and export project for production",
	watch: "Start dev-mode with hot-reload",
	run: "Run a PHP command script from the scripts/ folder",
	create: "Create a new project from an official template",
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
  ${c.dim("kiri run convert-images")}
  ${c.dim("kiri create --list")}
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

	if (!existsSync(cmdPath)) {
		console.error(
			`\n${c.red("❌")} Unknown command : ${c.bold(subcommand)}\n` +
			`  Type ${c.cyan("kiri --help")} to see avaiable commands.\n`
		);
		process.exit(1);
	}

	// Load and run the subcommand
	try {
		const cmdModule = await import(pathToFileURL(cmdPath).href);
		await cmdModule.default(rest);
		// process.exit(0);
	} catch (err) {
		console.error(`\n${c.red("❌")} Error: ${c.bold(subcommand)} failed:\n  ${typeof err == 'string' ? err : err.message}\n`);
		// console.log(err);
		process.exit(1);
	}
}

await main();