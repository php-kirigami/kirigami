import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Windows cannot execute npm.cmd without a shell. Locate npm's JS entry point
// and run it with Node instead; never fall back to cmd.exe or shell quoting.
export function resolveNpmCli(env = process.env, execPath = process.execPath) {
	const candidates = [];
	if (env.npm_execpath && path.isAbsolute(env.npm_execpath) &&
		path.basename(env.npm_execpath) === "npm-cli.js") candidates.push(env.npm_execpath);
	const searchPath = Object.entries(env).find(([key]) => key.toLowerCase() === "path")?.[1] ?? "";
	for (const directory of [...searchPath.split(path.delimiter), path.dirname(execPath)]) {
		const dir = directory.replace(/^"(.*)"$/, "$1");
		if (!path.isAbsolute(dir)) continue;
		candidates.push(path.join(dir, "node_modules", "npm", "bin", "npm-cli.js"));
	}
	for (const candidate of candidates) {
		if (fs.statSync(candidate, { throwIfNoEntry: false })?.isFile()) return candidate;
	}
	throw new Error("Cannot locate npm-cli.js. Install npm alongside Node or add its installation directory to PATH.");
}

export function runNpm(args, options = {}) {
	const windows = process.platform === "win32";
	return execFileSync(windows ? process.execPath : "npm",
		windows ? [resolveNpmCli(), ...args] : args,
		{ ...options, shell: false });
}
