import { parseArgs, printCommandHelp } from "../utils.js";
import { serveStdio } from "@kirigami/mcp";

const HELP = {
	name: "mcp",
	description: "Serve this project over MCP (stdio) — exposes kirigami_config/validate/build/export/run as tools for an AI agent.",
	usage: "",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"Talks the Model Context Protocol over stdin/stdout — meant to be launched by an MCP client (its config sets cwd to this project), not run interactively.",
		"Point a client at `kiri mcp` (or `npx @kirigami/mcp` / the kiri-mcp binary directly) with this project's root as its working directory.",
		"`kiri run`'s script access applies here too: kirigami_run can execute any named scripts/*.php in this project.",
	],
	examples: [
		"kiri mcp",
	],
};


// stdout is the MCP wire format once serveStdio() connects — no console.log
// past that point, only before (help) or via stderr (startup failure).
export default async function mcp(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	await serveStdio();
}
