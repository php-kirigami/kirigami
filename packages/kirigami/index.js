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
// `bin/cmd/*.js` (the actual `kiri` CLI) is NOT yet rewritten to call through
// this API — that's the next iteration (see todo.md, "Phase 2 — CLI" in the
// plan). This file is additive: it reuses the same config/plugin/task
// machinery `bin/` already has, without changing how the CLI itself behaves.
//
// Still bound to `process.cwd()` for locating kirigami.yaml, scripts/ and
// node_modules — same as the CLI. Loading a *different* project than the
// current working directory (multiple projects in one long-lived process)
// isn't supported yet: config.js/plugins.js/run.js all resolve paths off
// `process.cwd()` internally. Untangling that is future work, not done here.
// ---------------------------------------------------------------------------

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getConfig, clearConfigCache } from "./bin/config.js";
import { loadPlugins } from "./bin/libs/plugins.js";
import { runscript } from "./bin/cmd/run.js";
import { createDevServer } from "./bin/libs/devserver.js";
import { buildWatchRules, createWatchers } from "./bin/libs/watchengine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tasksDir = path.join(__dirname, "bin", "tasks");
// buildWatchRules() resolves task modules as `path.resolve(dirname, "../tasks", …)`
// — pass it a directory one level under tasksDir's parent so that math lands
// back on tasksDir, matching the convention bin/cmd/*.js already uses.
const watchEngineDir = path.join(__dirname, "bin", "cmd");


// Runs every `scripts:` entry whose `trigger` matches `name` (e.g.
// "before-build"), in order, stopping at the first failure. Deliberately
// reimplemented here instead of reusing bin/libs/triggers.js's `trigger()` —
// that one prints to the console and calls `process.exit(1)` on failure,
// both wrong for a library call. `runscript()` itself (bin/cmd/run.js) is
// already pure, so this just adds the scripts-list lookup around it.
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

	get config() {
		return this.#config;
	}

	// Loads (or re-loads) kirigami.yaml and the project's plugins. Safe to call
	// again after the file or an installed plugin changed on disk — each call
	// forces a fresh read instead of trusting getConfig()'s own cache, and
	// (from the second call on) resets the @kirigami/sdk hook registry before
	// plugins re-register, so hooks don't pile up duplicates.
	async reload() {
		if (this.#loaded) clearConfigCache();
		this.#config = await getConfig();
		await loadPlugins(this.#config, { reload: this.#loaded });
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
			results.push({ task: task.name, type: task.type, ...result });
			if (!result.success) return { success: false, trigger: beforeBuild, results };
		}

		return { success: true, trigger: beforeBuild, results };
	}

	// Starts the same watch+hot-reload dev server `kiri serve` uses. Returns
	// { address, port, url, close() } — `port: 0` lets the OS pick a free port,
	// reflected back in the returned `port`/`url` (see devserver.js). Meant for
	// an embedder (VS Code preview webview, MCP `kirigami_serve` tool) that
	// needs to know where the server ended up listening.
	async serve({ port = 4321, host = "127.0.0.1" } = {}) {
		if (!this.#loaded) await this.reload();
		const config = this.#config;

		const devserver = await createDevServer({ root: config.root, port, host });
		const rules = await buildWatchRules(config, watchEngineDir);
		const watchers = rules.map((rule) => ({
			...rule,
			callback: async (...cbArgs) => {
				await rule.callback(...cbArgs);
				if (rule.type === "sass") devserver.broadcastCssReload();
				else devserver.broadcastReload();
			},
		}));
		const { close: closeWatchers } = createWatchers(watchers);

		return {
			address: devserver.address,
			port: devserver.port,
			url: devserver.url,
			async close() {
				await closeWatchers();
				await devserver.close();
			},
		};
	}
}


export async function load() {
	const project = new Project();
	await project.reload();
	return project;
}


export const Kirigami = { load };
