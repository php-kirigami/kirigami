import { execFileSync } from "node:child_process";
import { resolveNpmCli } from "@kirigami/kirigami/internal/npm";

export { resolveNpmCli };

// Windows cannot execute npm.cmd without a shell: run npm's JS entry point
// with Node instead (see core's resolveNpmCli); never fall back to cmd.exe.
export function runNpm(args, options = {}) {
	const windows = process.platform === "win32";
	return execFileSync(windows ? process.execPath : "npm",
		windows ? [resolveNpmCli(), ...args] : args,
		{ ...options, shell: false });
}
