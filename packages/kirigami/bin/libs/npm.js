import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

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

// Runs npm asynchronously. Resolves `{ success, code, error? }`; never rejects.
// `stdio` is passed through to spawn ("inherit" streams npm's own output).
export function spawnNpm(args, { cwd = process.cwd(), stdio = "inherit" } = {}) {
	return new Promise((resolve) => {
		let child;
		try {
			const windows = process.platform === "win32";
			child = spawn(windows ? process.execPath : "npm",
				windows ? [resolveNpmCli(), ...args] : args,
				{ cwd, stdio, shell: false, windowsHide: true });
		} catch (err) {
			resolve({ success: false, code: null, error: err.message });
			return;
		}
		child.on("error", err => resolve({ success: false, code: null, error: err.message }));
		child.on("close", code => resolve(code === 0
			? { success: true, code }
			: { success: false, code, error: `npm ${args.join(" ")} exited with code ${code}` }));
	});
}
