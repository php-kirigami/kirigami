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

function projectRelative(projectDir, filePath) {
	return path.relative(projectDir, filePath).split(path.sep).join('/');
}

function listProjectDocs(projectDir) {
	const root = path.resolve(projectDir);
	const candidates = [
		'README.md',
		'docs/CONTEXT.md',
		'docs/INSTRUCTIONS.md',
		'docs/STATUS.md',
		'docs/DECISIONS.md',
		'docs/BUGS.md',
		'docs/TODO.md',
		'docs/ROADMAP.md',
		'docs/EXTENSION-VSCODE.md',
		'packages/mcp/README.md',
		'packages/cli/README.md',
		'packages/kirigami/README.md',
		'packages/vscode/README.md',
	];
	return candidates.filter((rel) => fs.existsSync(path.join(root, rel))).map((rel) => path.join(root, rel));
}

function readTextIfExists(filePath) {
	try {
		return fs.readFileSync(filePath, 'utf8');
	} catch {
		return null;
	}
}

function docTopicHints() {
	return {
		general: [
			{ path: 'README.md', reason: 'Overview of the project and the package ecosystem.' },
			{ path: 'docs/CONTEXT.md', reason: 'Architecture, monorepo layout, runtime model and conventions.' },
			{ path: 'docs/INSTRUCTIONS.md', reason: 'Development workflow, release procedure, README template.' },
		],
		site: [
			{ path: 'README.md', reason: 'Project overview plus the site-building mental model.' },
			{ path: 'docs/CONTEXT.md', reason: 'Monorepo package boundaries and how the engine fits together.' },
			{ path: 'packages/kirigami/README.md', reason: 'Core API and project conventions for building static sites.' },
		],
		pages: [
			{ path: 'packages/kirigami/README.md', reason: 'Page rendering, prepros wrapper model and per-page PHPDoc conventions.' },
			{ path: 'docs/CONTEXT.md', reason: 'The project root, root config and page generation model.' },
			{ path: 'docs/DECISIONS.md', reason: 'Design decisions around page types and layout wrapping.' },
		],
		build: [
			{ path: 'README.md', reason: 'High-level build/export flow and the project entrypoints.' },
			{ path: 'docs/INSTRUCTIONS.md', reason: 'Versioning and build/release workflow.' },
			{ path: 'packages/kirigami/README.md', reason: 'Project API and build-task documentation.' },
		],
		package: [
			{ path: 'docs/CONTEXT.md', reason: 'Package table and monorepo relationships.' },
			{ path: 'packages/kirigami/README.md', reason: 'Core engine package: project API and runtime.' },
			{ path: 'packages/cli/README.md', reason: 'CLI wrappers and command usage.' },
		],
		mcp: [
			{ path: 'packages/mcp/README.md', reason: 'MCP server contract, usage and tools.' },
			{ path: 'docs/CONTEXT.md', reason: 'MCP is described as a sibling face over the core Project API.' },
			{ path: 'docs/DECISIONS.md', reason: 'Design rationale for the MCP package split.' },
		],
		extension: [
			{ path: 'docs/EXTENSION-VSCODE.md', reason: 'VS Code extension implementation details and current limitations.' },
			{ path: 'packages/vscode/README.md', reason: 'User-facing extension documentation and status notes.' },
		],
		troubleshooting: [
			{ path: 'docs/BUGS.md', reason: 'Open issues and unresolved limitations.' },
			{ path: 'docs/TODO.md', reason: 'Near-term code tasks and known gaps.' },
			{ path: 'docs/STATUS.md', reason: 'Recent shipped fixes and current operational status.' },
		],
		license: [
			{ path: 'LICENSE', reason: 'Project-core license.' },
			{ path: 'NOTICE', reason: 'Repo-level licensing split notice.' },
			{ path: 'packages/php-wasm/LICENSE', reason: 'Runtime package license when treated separately.' },
		],
	};
}

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
					projectShape: {
						root: ['kirigami.yaml', 'src/', 'src/_index.php', 'src/_layouts/', 'assets/', 'scripts/'],
						description: 'A Kirigami project usually has a root kirigami.yaml, a src/ tree of PHP pages, optional _layouts/ includes, scripts/, and asset directories.',
						pagePattern: 'Use PHP page files under kirigami.root, usually named _index.php / _about.php / _products.php and wrapped by prepros.before / after or page types.',
					},
					pageRules: [
						'Pages live under kirigami.root and are PHP templates rendered by @kirigami/php-prepros.',
						'Use prepros.before / prepros.after or prepros.types.<name>.before / .after to wrap pages with a global layout.',
						'A page can opt into a type with @type <name> in its PHPDoc header.',
					],
					tasks: Array.isArray(project.tasks) ? project.tasks.map(t => ({ name: t.name, type: t.type })) : [],
					scripts: project.scripts || [],
					config: project.config ? { kirigami: project.config.kirigami, prepros: project.config.prepros } : null,
				};
				return ok(manifest);
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_search_docs",
		{
			title: "Search Kirigami docs",
			description: "Search the project's Markdown docs and README files for a query, returning matching paths and short excerpts. Useful when an agent needs the right docs for build, package layout, MCP, VS Code, or troubleshooting.",
			inputSchema: {
				query: z.string().min(1).describe("Query string to search for in docs and README files."),
				scope: z.enum(["all", "docs", "readme", "packages"]).optional().default("all").describe("Restrict the search to a subset of files."),
				limit: z.number().int().positive().max(20).optional().default(10).describe("Maximum number of matches to return."),
			},
		},
		async ({ query, scope = 'all', limit = 10 }) => {
			try {
				const projectDir = process.cwd();
				const candidates = listProjectDocs(projectDir).filter((filePath) => {
					const rel = projectRelative(projectDir, filePath).toLowerCase();
					if (scope === 'docs') return rel.startsWith('docs/');
					if (scope === 'readme') return rel === 'readme.md';
					if (scope === 'packages') return rel.startsWith('packages/');
					return true;
				});
				const needle = query.toLowerCase();
				const matches = [];
				for (const filePath of candidates) {
					const text = readTextIfExists(filePath) || '';
					if (!text) continue;
					const lower = text.toLowerCase();
					const index = lower.indexOf(needle);
					if (index === -1) continue;
					const start = Math.max(0, index - 120);
					const end = Math.min(text.length, index + 240);
					matches.push({
						path: projectRelative(projectDir, filePath),
						excerpt: (text.slice(start, end).replace(/\s+/g, ' ')).trim(),
					});
				}
				return ok({ query, scope, matches: matches.slice(0, limit) });
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_doc_hints",
		{
			title: "Suggested docs for a task",
			description: "Returns the best documentation files to read next for a common Kirigami task such as build, package layout, MCP, extension development, troubleshooting or licensing.",
			inputSchema: {
				topic: z.enum(['general', 'site', 'pages', 'build', 'package', 'mcp', 'extension', 'troubleshooting', 'license']).optional().default('general').describe("Task area to map to relevant docs."),
			},
		},
		async ({ topic = 'general' } = {}) => {
			try {
				const projectDir = process.cwd();
				const hints = docTopicHints()[topic] || docTopicHints().general;
				const recommended = hints.map((entry) => {
					const full = path.join(projectDir, entry.path);
					return {
						path: entry.path,
						exists: fs.existsSync(full),
						reason: entry.reason,
					};
				});
				return ok({ topic, recommended });
			} catch (e) { return fail(e); }
		}
	);

	server.registerTool(
		"kirigami_site_blueprint",
		{
			title: "Kirigami site blueprint",
			description: "Returns a minimal recommended project skeleton and the expected file layout for a new Kirigami static site. Includes the root config, page files, layouts, and a simple example page structure that an agent can scaffold immediately.",
		},
		async () => {
			try {
				const blueprint = {
					goal: 'Create a minimal Kirigami site with a root config, a source page tree, and optional layout wrappers.',
					structure: {
						'kirigami.yaml': 'Project config: project name, baseurl, root: src, optional prepros.before / before / after / types.',
						'src/': 'Root directory for all rendered PHP pages.',
						'src/_index.php': 'Home page template.',
						'src/_about.php': 'Another page template.',
						'src/_layouts/header.php': 'Optional global page header / opening wrapper.',
						'src/_layouts/footer.php': 'Optional global page footer / closing wrapper.',
						'src/_layouts/types/article.before.php': 'Optional page-type wrapper for article pages.',
						'src/_layouts/types/article.after.php': 'Closing wrapper for article pages.',
						'assets/': 'Images, fonts, CSS and other static assets.',
						'scripts/': 'Optional PHP scripts runnable via kiri run <name> or MCP.',
					},
					exampleConfig: `kirigami:\n  project: My Site\n  baseurl: https://example.com\n  root: src\nprepros:\n  before: _layouts/header.php\n  after: _layouts/footer.php\n  types:\n    article:\n      before: _layouts/types/article.before.php\n      after: _layouts/types/article.after.php\n`,
					examplePage: `<?php\n/**\n * @title About\n * @description Example page\n * @type article\n */\n?>\n<h1>About</h1>\n<p>Hello from Kirigami.</p>\n`,
					pageConventions: [
						'Everything under kirigami.root is rendered as a PHP page or included layout.',
						'Use prepros.before / after for a global layout shell.',
						'Use @type <name> in the PHPDoc header to enable a type-specific wrapper.',
						'Build tasks can include sass, esbuild, and the implicit prepros task.',
					],
				};
				return ok(blueprint);
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
