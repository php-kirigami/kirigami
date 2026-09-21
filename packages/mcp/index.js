// ---------------------------------------------------------------------------
// @kirigami/mcp — exposes a Kirigami project's Project API
// (@kirigami/kirigami) as MCP tools, so an AI agent can build/export/
// validate/run a site the same way `kiri` does from the terminal.
//
// Bound to whatever `process.cwd()` the project was loaded from, same as
// @kirigami/kirigami itself — launch this from the project root (an MCP
// client sets `cwd` in its server config).
//
// Deliberately excludes `serve`/`watch`: those are long-running (a local
// HTTP server, a filesystem watcher) and don't fit a request/response MCP
// tool call. A future addition would need its own background-process +
// status/stop tools, not this shape.
// ---------------------------------------------------------------------------

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from 'fs';
import path from 'path';
import { load } from "@kirigami/kirigami"; // --->>> Il faut faire les index.d.ts pour ce package

const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (error) => ({
	content: [{ type: "text", text: typeof error === "string" ? error : (error?.message || String(error)) }],
	isError: true,
});



// --->>> À ajouter: un tool pour reload pour éviter de reloader les configs pour rien
// --->>> Peut-être ajouter un bouton reload dans l'extension vscode


// Builds an McpServer wired to an already-loaded `Project` (see
// @kirigami/kirigami's `load()`). Every tool that reads or builds calls
// `project.reload()` first — the common agent loop is edit a file, then
// call a tool, then edit again, so a tool must never answer from a config
// snapshot older than the agent's own last edit.
export function createServer(project, { name = "kirigami", version = "0.1.0" } = {}) {
	const server = new McpServer({ name, version });

	server.registerTool(
		"kirigami_config",
		{
			title: "Kirigami project config",
			description: "Re-reads and returns the project's resolved kirigami.yaml (kirigami:/prepros:/image:/tasks:/… blocks) plus the list of active plugins. Call this first to understand a project before building or running anything in it.",
		},
		async () => {
			try {
				await project.reload(); // pas besoin de reloader
				return ok({ config: project.config, plugins: project.plugins });
			} catch (e) { return fail(e); }
		}
	);

	// Lightweight project manifest / about tool: returns a concise summary of the
	// project so an external agent can understand what's here without fetching
	// and parsing every file. Safe: doesn't execute project code, only reads
	// a few well-known docs and package.json.
	server.registerTool(
		"kirigami_about",
		{
			title: "Kirigami project manifest",
			description: "Returns a short structured manifest (name, version, README excerpt, docs/CONTEXT, LICENSE excerpt, tasks and scripts) so an agent can quickly learn what Kirigami is and what it can do.",
		},
		async () => {
			try {
				await project.reload();
				const projectDir = process.cwd();
				const readTrunc = (p, max = 2000) => {
					try {
						if (!fs.existsSync(p)) return null;
						let c = fs.readFileSync(p, 'utf8');
						if (c.length > max) return c.slice(0, max) + '\n...[truncated]';
						return c;
					} catch (e) { return null; }
				};
				const pkgPath = path.join(projectDir, 'package.json');
				let pkg = {};
				if (fs.existsSync(pkgPath)) {
					try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch(e) { pkg = {}; }
				}
				const manifest = {
					name: pkg.name || project?.config?.kirigami?.project || null,
					version: pkg.version || null,
					description: pkg.description || null,
					readme: readTrunc(path.join(projectDir, 'README.md')),
					context: readTrunc(path.join(projectDir, 'docs', 'CONTEXT.md')),
					instructions: readTrunc(path.join(projectDir, 'docs', 'INSTRUCTIONS.md')),
					license: readTrunc(path.join(projectDir, 'LICENSE'), 4000),
					tasks: Array.isArray(project.tasks) ? project.tasks.map(t => ({ name: t.name, type: t.type })) : [],
					scripts: project.scripts || [],
					config: project.config ? { kirigami: project.config.kirigami, prepros: project.config.prepros } : null,
				};
				return ok(manifest);
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_validate",
		{
			title: "Validate kirigami.yaml",
			description: "Re-reads and validates kirigami.yaml against the schema, without touching plugins. Cheaper than kirigami_build when you only need to know whether the config file itself is well-formed.",
		},
		async () => {
			try {
				await project.validate();
				return ok({ valid: true });
			} catch (e) {
				return ok({ valid: false, error: e?.message || String(e) });
			}
		}
	);

	server.registerTool(
		"kirigami_build",
		{
			title: "Build the Kirigami project",
			description: "Runs every configured task once, in place under kirigami.root — the same work `kiri build` does (development build, no minify/export). Reloads the config first.",
		},
		async () => {
			try {
				await project.reload();
				return ok(await project.build());
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_export",
		{
			title: "Export the Kirigami project",
			description: "Production build — same as `kiri export`: forces every task plus a copy into export.path (default \"dist\"), stamping the banner. Reloads the config first.",
			inputSchema: {
				path: z.string().optional().describe('Override export.path for this run (default: the project\'s own export.path, or "dist").'),
			},
		},
		async ({ path } = {}) => {
			try {
				await project.reload();
				return ok(await project.export({ path }));
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_run",
		{
			title: "Run a Kirigami PHP script",
			description: "Runs scripts/<command>.php inside the PHP-WASM runtime — same as `kiri run <command>`. The project's PHP class library (PREPROS, MD, HTML, …) is available with no include needed. Reloads the config first. Can execute any named script the project defines — only offer this to a project you trust. Use kirigami_list_scripts first if you don't already know the project's script names.",
			inputSchema: {
				command: z.string().describe("Script name, without the scripts/ prefix or .php extension."),
				args: z.array(z.string()).optional().describe("Extra words passed as $argv to the PHP script."),
			},
		},
		async ({ command, args = [] }) => {
			try {
				await project.reload(); // pas besoin de reloader
				return ok(await project.run(command, args));
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_list_scripts",
		{
			title: "List Kirigami scripts",
			description: "Lists every scripts/<name>.php file the project actually has — each runnable via kirigami_run by its name — with its trigger (before-build/before-export/after-export/none) and any extra mounted files, from a matching kirigami.yaml scripts: entry if one exists. Reloads the config first.",
		},
		async () => {
			try {
				await project.reload(); // pas besoin de reloader
				return ok({ scripts: project.scripts });
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_list_tasks",
		{
			title: "List Kirigami build tasks",
			description: "Lists the tasks kirigami_build/kirigami_run_task would run — the project's tasks: entries (esbuild/sass/…), plus the implicit \"render-all\" prepros task when prepros: is configured. Reloads the config first.",
		},
		async () => {
			try {
				await project.reload(); // pas besoin de reloader
				return ok({ tasks: project.tasks });
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_run_task",
		{
			title: "Run a single Kirigami build task",
			description: "Runs exactly one task by name — bypassing before-build and every other task — instead of the whole kirigami_build pipeline. Forces it regardless of the task's own default policy, since naming it is itself the intent to run it. Use kirigami_list_tasks first to get valid names. Reloads the config first.",
			inputSchema: {
				name: z.string().describe("A task name from kirigami_list_tasks (e.g. \"render-all\", or a tasks: entry's own name)."),
			},
		},
		async ({ name }) => {
			try {
				await project.reload(); // pas besoin de reloader
				return ok(await project.runTask(name));
			} catch (e) { return fail(e); }
		}
	);

	return server;
}


// Convenience used by bin/kiri-mcp.js and @kirigami/cli's `kiri mcp`: load
// the project at process.cwd() and serve it over stdio.
export async function serveStdio({ name, version } = {}) {
	const project = await load();
	const server = createServer(project, { name, version });
	await server.connect(new StdioServerTransport());
	return server;
}
