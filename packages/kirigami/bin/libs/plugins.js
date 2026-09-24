// ---------------------------------------------------------------------------
// Plugin loader. Reads the `plugins:` list from kirigami.yaml and, for each
// active entry, resolves the package, checks it against this kiri version, and
// calls its default export so it can register hooks via @kirigami/sdk (the
// shared in-memory registry — see that package).
//
// A plugin package may also declare itself in its own package.json under a
// top-level `kirigami` key:
//
//   "kirigami": {
//     "type": "plugin",                        // "plugin" | "command"
//     "minVersion": "1.2.0",                    // minimum @kirigami/kirigami version
//     "optionsSchema": "./options.schema.json"  // JSON Schema for its kirigami.yaml `options`
//   }
//
// A "command" package's register() calls @kirigami/sdk's registerCommand()
// to add a new `kiri <name>` subcommand instead of (or alongside) hooks —
// @kirigami/cli's dispatcher falls back to the registry for any name that
// isn't one of its own built-in commands.
//
// The `options` live entirely in kirigami.yaml. If `optionsSchema` is set, those
// options are validated against it before the plugin is loaded.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { reset as resetHooks, resetCommands, resetTaskTypes, listTaskTypes, run as runHook, HOOKS, registerCommand } from "@kirigami/sdk";
import { clearResolvedTaskTypes, builtInTaskTypes } from "./tasktypes.js";
import { getConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _loaded = false;
let _lastLoaded = [];
let _pluginDirs = [];


// Resolved package directories of the plugins activated by the last
// loadPlugins() call. Plugin-registered PHP scripts must live in one of them
// (see runscript.js); a linked or workspace plugin is outside the project.
export function activePluginDirs() {
	return _pluginDirs;
}


// `{ reload: true }` re-runs every plugin's register() even if already
// loaded — resetting the shared @kirigami/sdk hook registry first, since
// re-registering without a reset would pile up a duplicate set of listeners
// (see reset()'s own doc comment). Used by the programmatic `Project.reload()`
// API (package root index.js) so a long-lived host can pick up a changed
// kirigami.yaml `plugins:` list without restarting the process. Note: the
// hook registry is process-global (a @kirigami/sdk design constraint, see
// CLAUDE.md), so this resets hooks for *every* loaded project in the
// process, not just this one — fine today since only one project is ever
// loaded per process, but a real limit if that changes later.
//
// Returns the list of plugins actually loaded, as [{ name, version }] —
// doesn't print anything itself (an engine module shouldn't own terminal
// output); @kirigami/cli's commands render this list themselves.
export async function loadPlugins(config, { reload = false } = {}) {
	if (_loaded && !reload) return _lastLoaded;
	if (_loaded && reload) {
		resetHooks();
		resetCommands();
		resetTaskTypes();
		clearResolvedTaskTypes();
	}
	_loaded = true;
	_pluginDirs = [];

	config = config || await getConfig();
	const entries = (Array.isArray(config.plugins) ? config.plugins : [])
		.filter(p => p && p.name && p.active !== false);
	if (!entries.length) return (_lastLoaded = []);

	const kiriVer = kiriVersion();
	const loaded = [];

	for (const entry of entries) {
		const { name } = entry;

		const resolved = resolvePlugin(name);
		if (!resolved) {
			throw `Plugin "${name}" is not installed. Run: npm install ${name}`;
		}

		const pkgDir = ownerPackageDir(resolved, name);
		const pkg = pkgDir ? readJson(path.join(pkgDir, "package.json")) : {};
		const meta = pkg.kirigami || {};

		// "command" packages (kirigami.type: "command") register a new `kiri`
		// subcommand instead of/alongside hooks. Custom task types do not need a
		// separate manifest type: a normal plugin calls registerTaskType() during
		// this same registration step.
		if (meta.type && !["plugin", "command"].includes(meta.type)) {
			throw `Package "${name}" is a kirigami "${meta.type}", not a plugin — it can't go under "plugins:".`;
		}

		if (meta.minVersion && compareVersions(kiriVer, meta.minVersion) < 0) {
			throw `Plugin "${name}" requires @kirigami/kirigami >= ${meta.minVersion} (current: ${kiriVer}).`;
		}

		if (pkgDir) checkSdkCopy(name, pkgDir);

		const options = entry.options || {};

		// Validate the kirigami.yaml options against the plugin's own schema.
		if (meta.optionsSchema && pkgDir) {
			const schemaPath = path.resolve(pkgDir, meta.optionsSchema);
			const schema = readJson(schemaPath);
			if (!schema) throw `Plugin "${name}": optionsSchema not found at ${schemaPath}.`;
			const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
			if (!validate(options)) {
				const details = validate.errors
					.map((e) => `    ${e.instancePath || '(root)'} ${e.message}`)
					.join('\n');
				throw `Plugin "${name}": invalid options in kirigami.yaml:\n${details}`;
			}
		}

		const mod = await import(pathToFileURL(resolved).href);
		const register = mod.default || mod.register;
		if (typeof register !== "function") {
			throw `Plugin "${name}" has no default export to register.`;
		}

		await register(options, { config, name });
		loaded.push({ name, version: pkg.version || null });
		if (pkgDir) _pluginDirs.push(pkgDir);
	}

	// resolveTaskType() always prefers a built-in over the plugin registry, so
	// a plugin that registered one of these names would silently never run —
	// reject the collision here instead of letting it through unnoticed.
	for (const { name: typeName } of listTaskTypes()) {
		if (builtInTaskTypes.has(typeName)) {
			throw `Task type "${typeName}" collides with a built-in task type and cannot be registered by a plugin.`;
		}
	}

	// An alternative to calling registerCommand() directly from register():
	// a plugin can instead declare its command(s) via the commands:register
	// hook, same as scripts:register/tasks:register. Routed through
	// registerCommand() itself so duplicate names and a non-function `run`
	// are rejected the same way either style is used.
	for (const cmd of await runHook(HOOKS.COMMANDS_REGISTER, { config })) {
		if (cmd) registerCommand(cmd.name, cmd);
	}

	return (_lastLoaded = loaded);
}


// Resolve a plugin from the project's own node_modules first, then fall back to
// kiri's resolution (monorepo workspaces, a globally-linked plugin).
export function resolvePlugin(name) {
	for (const from of [path.join(process.cwd(), "index.js"), import.meta.url]) {
		try {
			return createRequire(from).resolve(name);
		} catch { /* try the next root */ }
	}
	return null;
}


// A plugin that pins another @kirigami/sdk version gets its own copy from npm.
// Copies from 0.3.0 on share one registry (the SDK keeps it on globalThis);
// an older copy keeps its own, so the plugin's hooks, commands and task types
// would never reach this engine. Fail loudly instead of building without them.
const SHARED_REGISTRY_SDK = "0.3.0";

function checkSdkCopy(name, pkgDir) {
	const pluginSdk = findSdkDir(pkgDir);
	const engineSdk = findSdkDir(__dirname);
	if (!pluginSdk || !engineSdk || pluginSdk === engineSdk) return;
	const version = readJson(path.join(pluginSdk, "package.json"))?.version || "0.0.0";
	if (compareVersions(version, SHARED_REGISTRY_SDK) >= 0) return;
	throw `Plugin "${name}" uses its own copy of @kirigami/sdk ${version}, too old to share hooks with this engine, so it would do nothing. Update it: npm install ${name}@latest`;
}


// Where Node would resolve @kirigami/sdk from `dir`: the nearest
// node_modules/@kirigami/sdk walking up, following links. The package's
// `exports` has no "require" condition, so createRequire can't resolve it.
function findSdkDir(dir) {
	for (let current = dir; ; current = path.dirname(current)) {
		const candidate = path.join(current, "node_modules", "@kirigami", "sdk");
		if (fs.existsSync(path.join(candidate, "package.json"))) {
			try { return fs.realpathSync(candidate); } catch { return candidate; }
		}
		if (path.dirname(current) === current) return null;
	}
}


// Walk up from a resolved entry file to the directory whose package.json
// actually owns it (matched by name), so we read the plugin's own manifest and
// schema — not a nested dependency's.
export function ownerPackageDir(entryPath, name) {
	let dir = path.dirname(entryPath);
	while (dir !== path.dirname(dir)) {
		const json = readJson(path.join(dir, "package.json"));
		if (json && json.name === name) return dir;
		dir = path.dirname(dir);
	}
	return null;
}


export function readJson(file) {
	try {
		return JSON.parse(fs.readFileSync(file, "utf8"));
	} catch {
		return null;
	}
}


export function kiriVersion() {
	try {
		return JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8")).version;
	} catch {
		return "0.0.0";
	}
}


// Numeric, dot/dash-separated compare — enough for "is X >= Y" without pulling
// in a semver dependency (stay lite). Pre-release tags are compared as numbers,
// which is coarse but fine for the minVersion gate.
export function compareVersions(a, b) {
	const pa = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0);
	const pb = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0);
		if (d) return d < 0 ? -1 : 1;
	}
	return 0;
}
