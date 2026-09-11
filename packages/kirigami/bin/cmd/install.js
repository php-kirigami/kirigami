import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import {
	resolvePlugin, ownerPackageDir, readJson, compareVersions, kiriVersion,
} from "../libs/plugins.js";

// Same naming convention kirigami.schema.json enforces for a `plugins:` entry
// (see `properties.plugins.items.properties.name.pattern`) — kept in sync by hand.
const PLUGIN_NAME_RE = /^(?:@kirigami\/plugin-[^/]+|[^/]+\/kirigami-plugin-[^/]+|kirigami-plugin-[^/]+)$/;

const HELP = {
	name: "install",
	description: "Install a Kirigami plugin and print the options block to add to kirigami.yaml.",
	usage: "<plugin...> [options]",
	options: [
		{ flag: "--save", desc: "Install as a regular dependency (default: devDependency)" },
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"A bare name (\"highlight\") is expanded against the @kirigami/plugin-* / kirigami-plugin-* conventions and checked on npm; a full package name is used as-is.",
		"Already installed → checks npm for a newer version and updates if there is one.",
		"Doesn't touch kirigami.yaml — prints the \"plugins:\" entry (built from the plugin's own kirigami.optionsSchema) for you to paste in.",
	],
	examples: [
		"kiri install highlight",
		"kiri install @kirigami/plugin-highlight",
		"kiri install highlight @kirigami/plugin-svg",
	],
};


export default async function install(args) {
	const { flags, command, subcommand, positional: rest } = parseArgs(args);
	// parseArgs slots the first two non-flag args into command/subcommand and
	// only the remainder into `positional` — collect all of them as plugin names.
	const inputs = [command, subcommand, ...rest].filter(Boolean);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	if (!inputs.length) {
		throw `Missing plugin name. Try ${c.cyan("kiri install --help")}.`;
	}

	if (!fs.existsSync(path.join(process.cwd(), "package.json"))) {
		throw `No package.json found in ${process.cwd()} — run this inside a Kirigami project.`;
	}

	console.log(`\n${c.bold(c.cyan("kiri"))} — Install plugin${inputs.length > 1 ? "s" : ""}\n`);

	for (const input of inputs) {
		const resolved = await resolvePluginName(input);
		if (!resolved) {
			log.error(
				`Couldn't find a Kirigami plugin matching "${input}" ` +
				`(tried @kirigami/plugin-${input}, kirigami-plugin-${input}). ` +
				`Pass the full package name for a third-party plugin.`
			);
			console.log();
			continue;
		}
		if (resolved.name !== input) log.step(`"${input}" → ${c.cyan(resolved.name)}`);

		await installOne(resolved.name, resolved.latest, flags);
		console.log();
	}
}


// A name already matching a supported convention is used as-is (its "latest"
// is still looked up, but existence isn't required — a private/workspace-only
// plugin not on public npm is fine). Otherwise treat it as a bare guess
// ("highlight", "plugin-highlight") and only accept the first candidate that
// actually exists on npm — silently installing a guessed-wrong package would
// be worse than asking for the full name.
async function resolvePluginName(input) {
	if (PLUGIN_NAME_RE.test(input)) {
		return { name: input, latest: await fetchLatestVersion(input) };
	}

	const bare = input.replace(/^(@kirigami\/)?plugin-/, "").replace(/^kirigami-plugin-/, "");
	for (const candidate of [`@kirigami/plugin-${bare}`, `kirigami-plugin-${bare}`]) {
		const latest = await fetchLatestVersion(candidate);
		if (latest) return { name: candidate, latest };
	}
	return null;
}


async function installOne(name, latest, flags) {
	const dir = path.join(process.cwd(), "node_modules", name);
	const installed = readJson(path.join(dir, "package.json"));

	if (installed && latest && compareVersions(installed.version, latest) >= 0) {
		log.step(`${c.cyan(name)} — already up to date ${c.dim(`(v${installed.version})`)}`);
	} else {
		const spec = latest ? `${name}@${latest}` : name;
		log.step(installed
			? `Updating ${c.cyan(name)} ${c.dim(`v${installed.version} → v${latest ?? "latest"}`)}...`
			: `Installing ${c.cyan(name)}${latest ? c.dim(` v${latest}`) : ""}...`);

		try {
			execSync(`npm install ${flags.save ? "" : "--save-dev "}${spec}`, {
				cwd: process.cwd(),
				stdio: "inherit",
			});
		} catch (err) {
			log.error(`npm install failed for ${name}: ${err.message}`);
			return;
		}
		log.success(`${c.bold(name)} installed`);
	}

	printPluginOptions(name);
}


// npm registry's "abbreviated" per-version endpoint returns just that version's
// manifest — fast, no need to fetch the whole packument. Offline / registry
// unreachable → null, and the caller falls back to a bare "npm install <name>".
async function fetchLatestVersion(name) {
	try {
		const url = `https://registry.npmjs.org/${name.replace("/", "%2f")}/latest`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return null;
		return (await res.json()).version ?? null;
	} catch {
		return null;
	}
}


// Reads the freshly-installed plugin's own package.json ("kirigami" field +
// optionsSchema) and prints a ready-to-paste "plugins:" entry — kirigami.yaml
// itself is never touched, this is display only.
function printPluginOptions(name) {
	const resolved = resolvePlugin(name);
	if (!resolved) {
		log.warn(`Couldn't resolve "${name}" after install — is it actually a package with a main entry?`);
		return;
	}

	const pkgDir = ownerPackageDir(resolved, name);
	const pkg = pkgDir ? readJson(path.join(pkgDir, "package.json")) : null;
	const meta = pkg?.kirigami || {};

	if (meta.type && meta.type !== "plugin") {
		log.warn(`"${name}" declares kirigami.type "${meta.type}", not "plugin" — skipping the options printout.`);
		return;
	}

	if (meta.minVersion && compareVersions(kiriVersion(), meta.minVersion) < 0) {
		log.warn(`"${name}" needs @kirigami/kirigami >= ${meta.minVersion} (running ${kiriVersion()}).`);
	}

	const schema = meta.optionsSchema && pkgDir
		? readJson(path.resolve(pkgDir, meta.optionsSchema))
		: null;

	console.log(`\n${c.bold("Add this to")} ${c.cyan("kirigami.yaml")} ${c.bold("under")} ${c.cyan("plugins:")}\n`);
	console.log(c.dim("plugins:"));
	console.log(c.dim(`  - name: `) + name);
	console.log(c.dim(`    active: `) + "true");

	const props = schema?.properties;
	if (!props || !Object.keys(props).length) {
		if (schema) console.log(c.dim("    # no options declared by this plugin"));
		return;
	}

	console.log(c.dim("    options:"));
	for (const [key, def] of Object.entries(props)) {
		if (def.description) console.log(c.dim(`      # ${def.description}`));
		const value = "default" in def ? def.default : undefined;
		console.log(`      ${key}: ${value !== undefined ? yamlValue(value) : c.dim(`# ${def.type ?? "?"}`)}`);
	}
}


function yamlValue(v) {
	if (Array.isArray(v) || (v !== null && typeof v === "object")) return JSON.stringify(v);
	return String(v);
}
