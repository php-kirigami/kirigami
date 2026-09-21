// ---------------------------------------------------------------------------
// @kirigami/kirigami — programmatic entry point.
//
// `Kirigami.load()` mirrors what `kiri build`/`kiri serve` do, but as an
// importable API instead of a terminal command: methods return structured
// results instead of printing to the console, and nothing here ever calls
// `process.exit()`. Meant for a long-lived embedder — a VS Code extension, an
// MCP server, a script — that wants to drive Kirigami without shelling out to
// `kiri` and re-spawning a process for every build.
//
// `@kirigami/cli`'s `build`/`serve`/`watch`/`export`/`run` commands are thin
// wrappers over this API (see that package's bin/cmd/*.js). `create`/`install`
// don't operate on a loaded project (create has none yet, install shells out
// to npm before plugins load) and `cache`/`phpinfo` don't touch kirigami.yaml
// at all — none of those four are a natural `Project` method, so they keep
// their own CLI-side logic. `test` is dead debug scaffolding, not a real
// command.
//
// Still bound to `process.cwd()` for locating kirigami.yaml, scripts/ and
// node_modules — same as the CLI. Loading a *different* project than the
// current working directory (multiple projects in one long-lived process)
// isn't supported yet: config.js/plugins.js/runscript.js all resolve paths
// off `process.cwd()` internally. Untangling that is future work, not done
// here.
// ---------------------------------------------------------------------------

// TypeScript declarations are still missing.


import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getConfig, clearConfigCache } from "./bin/config.js";
import { loadPlugins } from "./bin/libs/plugins.js";
import { runscript } from "./bin/libs/runscript.js";
import { createDevServer } from "./bin/libs/devserver.js";
import { buildWatchRules, createWatchers } from "./bin/libs/watchengine.js";
import { assertSafeExportPaths } from "./bin/tasks/dist.js";
import { clearPhpIncludesCache } from "./bin/tasks/prepros.js";
import { resetRuntime } from "@kirigami/php-prepros";
import { findFiles } from "./bin/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tasksDir = path.join(__dirname, "bin", "tasks");


// Runs every `scripts:` entry whose `trigger` matches `name` (e.g.
// "before-build"), in order, stopping at the first failure. Deliberately
// reimplemented here instead of reusing bin/libs/triggers.js's `trigger()`
// (which moved to @kirigami/cli on the package split, and prints to the
// console + calls `process.exit(1)` on failure — both wrong for a library
// call). `runscript()` itself is already pure, so this just adds the
// scripts-list lookup around it.
async function runTrigger(config, name) {
	const scripts = (config.scripts || []).filter((s) => s.trigger === name);
	const results = [];
	for (const script of scripts) {
		const result = await runscript(script.name);
		results.push({ name: script.name, ...result });
		if (!result.success) return { success: false, results };
	}
	return { success: true, results };
}


export class Project {
	#loaded = false;
	#config = null;
	#plugins = [];

	get config() {
		return this.#config;
	}

	// [{ name, version }] for every plugin loadPlugins() actually activated on
	// the last load()/reload() — empty until then.
	get plugins() {
		return this.#plugins;
	}


	// Reload configuration and plugin registrations, invalidating PHP state too.
	// JavaScript plugin modules remain subject to Node's import cache. Callers
	// must await whole-project operations; the PHP queue only protects PHP work.
	async reload() {
		this.#loaded = false;
		this.#config = null;
		this.#plugins = [];
		clearConfigCache();
		await resetRuntime();
		clearPhpIncludesCache();
		this.#config = await getConfig();
		this.#plugins = await loadPlugins(this.#config, { reload: true });
		this.#loaded = true;
		return this;
	}

	// Re-reads and re-validates kirigami.yaml without touching plugins/hooks —
	// cheaper than reload() when the caller only wants to know whether the
	// config file itself is still well-formed (e.g. on every keystroke in a
	// VS Code editor). Throws the same way getConfig() does on an invalid file.
	async validate() {
		clearConfigCache();
		this.#config = await getConfig();
		return true;
	}

	// Runs every configured task once (build.js's task loop, minus the console
	// output and process.exit). Stops at the first failing task/trigger and
	// returns { success: false, … } rather than throwing, so a caller can
	// inspect what happened without try/catch for the expected-failure case.
	async build() {
		if (!this.#loaded) await this.reload();
		const config = this.#config;

		const beforeBuild = await runTrigger(config, "before-build");
		if (!beforeBuild.success) return { success: false, trigger: beforeBuild, results: [] };

		const tasks = config.prepros
			? [{ name: "render-all", type: "prepros", force: true, config: config.prepros }, ...config.tasks]
			: config.tasks;

		const modules = {};
		const results = [];
		for (const task of tasks) {
			if (!modules[task.type]) {
				const taskPath = path.join(tasksDir, `${task.type}.js`);
				modules[task.type] = await import(pathToFileURL(taskPath).href);
			}
			if (!task.force && !modules[task.type].canbuild) continue;

			const result = await modules[task.type].default(config.root, task);
			results.push({ task: task.name, type: task.type, taskname: modules[task.type].taskname, ...result });
			if (!result.success) return { success: false, trigger: beforeBuild, results };
		}

		return { success: true, trigger: beforeBuild, results };
	}

	// Same task eligibility as build(), with forced implicit render/copy tasks,
	// writing into "export:path" (default "dist",
	// resolved against process.cwd() — same anchor kirigami.yaml itself
	// loads from, not config.root) instead of in place. Runs "before-export"
	// then "before-build" first, "after-export" last; stops at the first
	// failing trigger script or task, same early-return shape as build().
	async export({ path: exportPath } = {}) {
		if (!this.#loaded) await this.reload();
		const config = this.#config;

		if (!config.export) config.export = {};
		config.export.path = exportPath || config.export.path || "dist";
		const dist = path.resolve(process.cwd(), config.export.path);
		// Reject unsafe output before running hooks or rendering any pages.
		try {
			assertSafeExportPaths(config.root, dist);
		} catch (error) {
			return { success: false, dist, error: error.message, beforeExport: null, beforeBuild: null, afterExport: null, results: [] };
		}

		const beforeExport = await runTrigger(config, "before-export");
		if (!beforeExport.success) return { success: false, dist, beforeExport, beforeBuild: null, afterExport: null, results: [] };

		const beforeBuild = await runTrigger(config, "before-build");
		if (!beforeBuild.success) return { success: false, dist, beforeExport, beforeBuild, afterExport: null, results: [] };

		const tasks = [
			...(config.prepros ? [{ name: "render-all", type: "prepros", force: true, config: config.prepros }] : []),
			{ name: "copy-files", type: "dist", force: true, path: dist, ...config.export },
			...config.tasks,
		];

		const modules = {};
		const results = [];
		for (const task of tasks) {
			if (!modules[task.type]) {
				const taskPath = path.join(tasksDir, `${task.type}.js`);
				modules[task.type] = await import(pathToFileURL(taskPath).href);
			}
			if (!task.force && !modules[task.type].canbuild) continue;

			task.banner = config.kirigami.banner;
			const result = await modules[task.type].default(config.root, task, dist);
			results.push({ task: task.name, type: task.type, taskname: modules[task.type].taskname, ...result });
			if (!result.success) return { success: false, dist, beforeExport, beforeBuild, afterExport: null, results };
		}

		const afterExport = await runTrigger(config, "after-export");
		return { success: afterExport.success, dist, beforeExport, beforeBuild, afterExport, results };
	}


	// Starts the same watch+hot-reload dev server `kiri serve` uses. Returns
	// { address, port, url, close() } — `port: 0` lets the OS pick a free port,
	// reflected back in the returned `port`/`url` (see devserver.js). Meant for
	// an embedder (VS Code preview webview, MCP `kirigami_serve` tool) that
	// needs to know where the server ended up listening.
	//
	// `onBuildResult`, if given, is called for every watch-triggered rebuild —
	// once with { status: "start" } right before it runs, once with
	// { status: "done", success, files, warnings, error } right after — so an
	// embedder (e.g. a VS Code status bar item) can reflect real build state
	// instead of re-parsing console output.
	async serve({ port = 4321, host = "127.0.0.1", onBuildResult } = {}) {
		if (!this.#loaded) await this.reload();
		const config = this.#config;

		const devserver = await createDevServer({ root: config.root, port, host });
		let watchHandle;
		try {
			const rules = await buildWatchRules(config);
			const watchers = rules.map((rule) => ({
				...rule,
				callback: async (...cbArgs) => {
					let result;
					try {
						if (onBuildResult) await onBuildResult({ status: "start", rule: rule.name, type: rule.type });
						result = await rule.callback(...cbArgs);
						if (result?.success !== false) {
							if (rule.type === "sass") devserver.broadcastCssReload();
							else devserver.broadcastReload();
						}
					} catch (error) {
						result = { success: false, error: error?.message || String(error), files: [] };
						console.error(`[${rule.name}] build failed:`, error);
					}
					if (onBuildResult) await onBuildResult({ ...result, status: "done", rule: rule.name, type: rule.type });
					return result;
				},
			}));
			watchHandle = createWatchers(watchers);
			await watchHandle.ready;

			return {
				address: devserver.address,
				port: devserver.port,
				url: devserver.url,
				async close() {
					try { await watchHandle.close(); }
					finally { await devserver.close(); }
				},
			};
		} catch (error) {
			try { await watchHandle?.close(); }
			finally { await devserver.close(); }
			throw error;
		}
	}

	// Same watch machinery as serve(), minus the HTTP server/hot-reload —
	// rebuilds files on disk on change, nothing else. Returns { close() }.
	async watch() {
		if (!this.#loaded) await this.reload();
		const rules = await buildWatchRules(this.#config);
		const handle = createWatchers(rules);
		try { await handle.ready; }
		catch (error) { await handle.close(); throw error; }
		return { close: handle.close };
	}

	// Runs scripts/<command>.php inside the PHP-WASM runtime — the same
	// scripts/ entry point "kiri run" and the before-build/before-export/
	// after-export triggers use, minus the trigger-name lookup (a plain
	// command name, not a trigger). Throws if the script doesn't exist (same
	// as runscript() itself) rather than returning a failure result, since
	// there's no partial work to report back on a bad command name.
	async run(command, argv = []) {
		if (!this.#loaded) await this.reload();
		return runscript(command, argv);
	}

	// Every scripts/<name>.php file actually on disk is runnable via run(),
	// whether or not it has a matching kirigami.yaml `scripts:` entry — that
	// entry only adds `mount`/`trigger` metadata (see runscript.js). This
	// lists what's really runnable, merging in that metadata where present,
	// so an embedder isn't limited to (or misled by) the yaml block alone.
	// Empty until reload()/load() has populated #config.
	get scripts() {
		const config = this.#config;
		if (!config) return [];
		const declared = new Map((config.scripts || []).map((s) => [s.name, s]));
		return findFiles("scripts/*.php")
			.map((file) => path.basename(file, ".php"))
			.sort()
			.map((name) => ({ name, mount: declared.get(name)?.mount || [], trigger: declared.get(name)?.trigger || null }));
	}

	// The tasks build()/watch() actually iterate over: config.tasks, plus the
	// synthetic "render-all" prepros task build() prepends when `prepros:` is
	// set (same shape build() constructs — kept in one place so runTask() and
	// any caller wanting "what can I run" see exactly what build() would run).
	// Empty until reload()/load() has populated #config.
	get tasks() {
		const config = this.#config;
		if (!config) return [];
		return config.prepros
			? [{ name: "render-all", type: "prepros", force: true, config: config.prepros }, ...config.tasks]
			: config.tasks;
	}

	// Runs exactly one task from `tasks` by name, bypassing before-build and
	// every other task — for an embedder that wants to re-run (or run for the
	// first time) a single piece of the pipeline instead of the whole build.
	// Always forces the task (ignores its own `canbuild` gating), since
	// naming it directly is itself the intent to run it. Returns a failure
	// result rather than throwing on an unknown name, same shape as a task's
	// own result, so a caller doesn't need a separate try/catch for a typo.
	async runTask(name) {
		if (!this.#loaded) await this.reload();
		const config = this.#config;
		const task = this.tasks.find((t) => t.name === name);
		if (!task) return { success: false, error: `Unknown task: "${name}".` };

		const taskPath = path.join(tasksDir, `${task.type}.js`);
		const mod = await import(pathToFileURL(taskPath).href);
		const result = await mod.default(config.root, { ...task, force: true });

		return { task: task.name, type: task.type, taskname: mod.taskname, ...result };
	}
}


export async function load() {
	const project = new Project();
	await project.reload();
	return project;
}


export const Kirigami = { load };
