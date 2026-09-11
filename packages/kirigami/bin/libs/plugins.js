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
//     "type": "plugin",                        // "plugin" | (later: "task", "command")
//     "minVersion": "1.2.0",                    // minimum @kirigami/kirigami version
//     "optionsSchema": "./options.schema.json"  // JSON Schema for its kirigami.yaml `options`
//   }
//
// The `options` live entirely in kirigami.yaml. If `optionsSchema` is set, those
// options are validated against it before the plugin is loaded.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { getConfig } from "../config.js";
import { c, log } from "../utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let _loaded = false;


export async function loadPlugins() {
	if (_loaded) return;
	_loaded = true;

	const config = await getConfig();
	const entries = (Array.isArray(config.plugins) ? config.plugins : [])
		.filter(p => p && p.name && p.active !== false);
	if (!entries.length) return;

	console.log(`\n${c.bold("Plugins:")}`);
	const kiriVer = kiriVersion();

	for (const entry of entries) {
		const { name } = entry;

		const resolved = resolvePlugin(name);
		if (!resolved) {
			throw `Plugin "${name}" is not installed. Run: npm install ${name}`;
		}

		const pkgDir = ownerPackageDir(resolved, name);
		const pkg = pkgDir ? readJson(path.join(pkgDir, "package.json")) : {};
		const meta = pkg.kirigami || {};

		if (meta.type && meta.type !== "plugin") {
			throw `Package "${name}" is a kirigami "${meta.type}", not a plugin — it can't go under "plugins:".`;
		}

		if (meta.minVersion && compareVersions(kiriVer, meta.minVersion) < 0) {
			throw `Plugin "${name}" requires @kirigami/kirigami >= ${meta.minVersion} (current: ${kiriVer}).`;
		}

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
		log.step(`${c.green("✔")} ${name}${pkg.version ? c.dim(` v${pkg.version}`) : ""}`);
	}
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
