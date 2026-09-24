// ---------------------------------------------------------------------------
// Regression suite runner — what `npm test` and CI run.
//
//   node scripts/test.js [test files...]
//
// Compiles the VS Code extension (its activation test loads the bundle), then
// runs every packages/*/test/*.test.{js,cjs} with node:test, one file at a
// time: several tests change the working directory and load process-global
// registries. Pass test files to run only those (the extension is still
// compiled first).
//
// PHP extension discovery is turned off (KIRIGAMI_PHPEXT_DISCOVERY=off) so
// results don't depend on @kirigami/phpext-* packages installed locally or
// globally. The TLS test also needs a native PHP with cURL on PATH, or
// PHP_BINARY pointing at one.
//
// Spawns Node directly instead of npm, so it runs the same on Windows.
// ---------------------------------------------------------------------------

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, KIRIGAMI_PHPEXT_DISCOVERY: "off" };

function run(args, cwd = root) {
	const { status, error } = spawnSync(process.execPath, args, { cwd, env, stdio: "inherit" });
	if (error) throw error;
	if (status !== 0) process.exit(status ?? 1);
}

run(["esbuild.mjs"], path.join(root, "packages", "vscode"));

const files = process.argv.slice(2);
run(["--test", "--test-concurrency=1",
	...(files.length ? files : ["packages/*/test/*.test.js", "packages/*/test/*.test.cjs"])]);
