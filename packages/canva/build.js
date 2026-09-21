import { build, formatMessages } from "esbuild";
import { watch as chokidarWatch } from "chokidar";
import fg from "fast-glob";
import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Rebuild the complete output tree so deleted scripts, maps, declarations,
// and styles cannot survive a watch rebuild. Callers serialize rebuilds.
export async function buildAll(root = process.cwd()) {
	root = path.resolve(root);
	const dist = path.join(root, "dist");
	if (path.dirname(dist) !== root) throw new Error("Invalid build output directory");
	await rm(dist, { recursive: true, force: true });
	const entries = await fg("src/scripts/**/*.js", { cwd: root });
	if (entries.length) {
		const result = await build({
			absWorkingDir: root,
			entryPoints: entries,
			outdir: "dist/scripts",
			outbase: "src/scripts",
			format: "esm",
			bundle: false,
			sourcemap: true,
			target: ["es2022"],
			platform: "browser",
			logLevel: "silent",
			loader: { '.json': 'json' },
		});
		if (result.warnings.length) {
			const messages = await formatMessages(result.warnings, { kind: "warning", color: true });
			console.warn(messages.join("\n"));
		}
		console.log(`Scripts built (${entries.length} files)`);
	}
	for (const file of await fg("src/scripts/**/*.d.ts", { cwd: root })) {
		const dest = path.join(dist, "scripts", path.relative("src/scripts", file));
		await mkdir(path.dirname(dest), { recursive: true });
		await copyFile(path.join(root, file), dest);
	}
	await cp(path.join(root, "src/styles"), path.join(dist, "styles"), { recursive: true });
	console.log("Declarations and styles copied");
}

// Debounce changes and await each rebuild. Changes arriving during a build
// request another pass, including after a failed build.
export function watchBuild(root = process.cwd()) {
	root = path.resolve(root);
	let timer;
	let pending = false;
	let closed = false;
	let running = null;
	const report = error => console.error("Canva build failed:", error);
	const flush = () => {
		if (running || closed) return;
		running = (async () => {
			while (pending && !closed) {
				pending = false;
				try { await buildAll(root); } catch (error) { report(error); }
			}
		})().finally(() => { running = null; });
	};
	const watcher = chokidarWatch([path.join(root, "src/scripts"), path.join(root, "src/styles")], {
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 20 },
	});
	watcher.on("all", () => {
		clearTimeout(timer);
		timer = setTimeout(() => { pending = true; flush(); }, 100);
	});
	watcher.on("error", report);
	return {
		ready: new Promise((resolve, reject) => {
			watcher.once("ready", resolve);
			watcher.once("error", reject);
		}),
		async close() {
			closed = true;
			clearTimeout(timer);
			await watcher.close();
			await running;
		},
	};
}

async function main() {
	await buildAll();
	if (process.argv.includes("--watch")) {
		await watchBuild().ready;
		console.log("Watch enabled");
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
	main().catch(error => {
		console.error("Canva build failed:", error);
		process.exitCode = 1;
	});
}
