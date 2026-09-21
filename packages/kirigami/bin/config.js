import fs from 'fs';
import path from "path";
import util from "util";
import Ajv from 'ajv';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';
import { walkFile } from "@kirigami/struct-walker";
import { formatDate } from "./utils.js";


const require = createRequire(import.meta.url);
const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');

let config = null;
let schemaValidator = null;


// Reads + validates a kirigami.yaml from disk, fresh every call (no caching).
// Used directly by callers that need to reload after the file changed on
// disk (the programmatic `Project.reload()` API — see the package root
// index.js) without needing to clear/touch getConfig()'s own cache.
export async function loadConfig(configPath = __configpath) {
	if (!fs.existsSync(configPath)) throw `Config file not found: ${configPath}`;
	const _config = await walkFile(configPath);
	if(!_config) throw `Invalid config file: ${configPath}`;
	validateAgainstSchema(_config, configPath);
	await validateConfig(_config, configPath);
	return _config;
}


export async function getConfig() {
	if(!config) config = await loadConfig(__configpath);
	return config;
}


// Drops getConfig()'s cached result so the next call re-reads kirigami.yaml
// from disk. Still bound to the same cwd-derived path as getConfig() itself.
export function clearConfigCache() {
	config = null;
}


// ---------------------------------------------------------------------------
// Structural validation against kirigami.schema.json (the same schema editors
// use for kirigami.yaml autocompletion), run once walkFile() has loaded the
// file and resolved its nested file references. Catches unknown keys, wrong
// types and missing required properties before the imperative checks in
// validateConfig() below. strict: false so the schema's `examples`/`default`
// annotations compile without extra Ajv plugins; validateFormats: false skips
// the `format` keyword (baseurl is checked imperatively in validateConfig()).
// ---------------------------------------------------------------------------
function validateAgainstSchema(_config, configPath) {
	if (!schemaValidator) {
		const schema = structuredClone(require('../kirigami.schema.json'));
		inlinePluginOptionSchemas(schema);
		const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
		schemaValidator = ajv.compile(schema);
	}

	if (!schemaValidator(_config)) {
		const details = schemaValidator.errors
			.map((e) => `  ${e.instancePath || '(root)'} ${e.message}`)
			.join('\n');
		throwConfigError(configPath, `Schema validation failed:\n${details}`);
	}
}


// ---------------------------------------------------------------------------
// The published schema points each first-party plugin's `options` at that
// package's own options.schema.json via a relative `$ref` (see
// `properties.plugins.items.allOf`) — great for editors, but Ajv here can't
// follow a bare relative file ref. Resolve those refs from disk (relative to
// the schema file) and inline them; drop the conditional when the plugin
// isn't installed. `kiri`'s plugin loader still validates options against the
// real installed schema too — this is just so `kiri build` doesn't choke on
// the ref and gives an early hint.
// ---------------------------------------------------------------------------
function inlinePluginOptionSchemas(schema) {
	const items = schema?.properties?.plugins?.items;
	if (!Array.isArray(items?.allOf)) return;

	const schemaDir = path.dirname(require.resolve('../kirigami.schema.json'));
	items.allOf = items.allOf.flatMap((entry) => {
		const ref = entry?.then?.properties?.options?.$ref;
		if (typeof ref !== 'string') return [entry];
		try {
			const target = JSON.parse(fs.readFileSync(path.resolve(schemaDir, ref), 'utf8'));
			delete target.$id;
			delete target.$schema;
			entry.then.properties.options = target;
			return [entry];
		} catch {
			return []; // plugin not installed in this project — skip its schema
		}
	});

	// An empty `allOf: []` is invalid JSON Schema — Ajv refuses to compile it
	// ("schema is invalid: ... allOf must NOT have fewer than 1 items"), which
	// would break `kiri build` for every project that doesn't have a first-party
	// plugin installed. Drop the key entirely when nothing resolved.
	if (items.allOf.length === 0) delete items.allOf;
}


async function validateConfig(config, configPath) {
	const modules = [];
	const projectDir = path.dirname(configPath);

	function validateIncludedFile(key, rel) {
		if (rel === undefined || rel === null || rel === '') return;
		const abs = path.resolve(__root, rel);
		if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
			throwConfigError(configPath, `Invalid "${key}" property: ${JSON.stringify(rel)} does not exist.`);
		}
	}

	// Verify kirigami section
	if(!config.kirigami) throwConfigError(configPath, `Missing "kirigami" configuration section.`);

	// verify kirigami.project, kirigami.baseurl
	if(!config.kirigami.project) throwConfigError(configPath, `Missing "kirigami:project" property.`);
	if(!config.kirigami.baseurl) throwConfigError(configPath, `Missing "kirigami:baseurl" property.`);
	config.kirigami.baseurl = config.kirigami.baseurl.replace(/\/$/, '');

	// Verify root
	if(!config.kirigami.root) throwConfigError(configPath, `Missing "kirigami:root" property.`);
	const __root = path.resolve(projectDir, config.kirigami.root);
	if (!fs.existsSync(__root)) throwConfigError(configPath, `Invalid "kirigami:root" property.`);
	config.root = __root;

	// Verify banner. A `kirigami:banner` file is filled from the config; with no
	// file set, the bundled ASCII template is used the same way. `###DATE###`
	// (and the rest) are resolved here, on every build/export — the committed
	// banner.txt keeps its placeholders.
	if(config.kirigami.banner) {
		const bannerFile = path.join(projectDir, config.kirigami.banner);
		if (!fs.existsSync(bannerFile)) throwConfigError(configPath, `Invalid "kirigami:banner" property.`);
		config.kirigami.banner = fillBanner(fs.readFileSync(bannerFile, 'utf8'), config.kirigami);
	} else {
		const tpl = path.join(__dirname, '..', 'assets', 'banner-template.txt');
		config.kirigami.banner = fs.existsSync(tpl)
			? fillBanner(fs.readFileSync(tpl, 'utf8'), config.kirigami)
			: `Exported by Kirigami: ${formatDate()}`;
	}

	// Verify image section
	if(!config.image) config.image = {};
	if(!config.image.format) config.image.format = 'webp';
	if(!config.image.source) config.image.source = 'assets/images/';
	if(!config.image.dest) config.image.dest = 'images/';

	// Verify prepros include wrappers, which are resolved relative to the project root.
	if (config.prepros) {
		validateIncludedFile('prepros:before', config.prepros.before);
		validateIncludedFile('prepros:after', config.prepros.after);
		for (const [typeName, typeConfig] of Object.entries(config.prepros.types || {})) {
			if (!typeConfig || typeof typeConfig !== 'object') continue;
			validateIncludedFile(`prepros:types.${typeName}.before`, typeConfig.before);
			validateIncludedFile(`prepros:types.${typeName}.after`, typeConfig.after);
		}
	}

	// Verify tasks
	if(config.tasks) {
		await Promise.all(config.tasks.map(async task => {
			if(!task.type) throwConfigError(configPath, `Invalid task type: ${util.inspect(task)}.`);
			if(!task.name) throwConfigError(configPath, `Invalid task name: ${util.inspect(task)}.`);
			try {
				if(!modules[task.type]) {
					const taskPath = path.resolve(__dirname, "tasks", `${task.type}.js`);
					if (!fs.existsSync(taskPath)) throwConfigError(configPath, `Unknown task type: ${util.inspect(task)}.`);
					modules[task.type] = await import(pathToFileURL(taskPath).href);
				}
				await modules[task.type].validate(__root, task);
			} catch(err) {
				throwConfigError(configPath, typeof err == 'string' ? err : err.message);
			}
		}));
	} else config.tasks = [];

	return true;
}


function throwConfigError(__configpath, msg) {
	throw `Invalid config file: ${__configpath}\n  ${msg}`;
}


// A GitHub Pages base URL → the repo it is served from.
//   https://user.github.io/project  →  https://github.com/user/project
//   https://user.github.io          →  https://github.com/user/user.github.io
// Anything else (custom domain, non-GitHub host) → '' (caller keeps the token
// empty and the line is dropped). Also used by `kiri create` for its wizard
// default.
export function deriveRepo(baseurl) {
	if (!baseurl) return '';
	const m = String(baseurl).match(/^https?:\/\/([^./]+)\.github\.io(?:\/([^/?#]+))?/i);
	if (!m) return '';
	return `https://github.com/${m[1]}/${m[2] || `${m[1]}.github.io`}`;
}


// Fills the ### ### placeholders of a banner from the `kirigami:` config, then
// tidies any line whose value(s) came out empty ("Author:  Foo <>" → "Author:
// Foo"; a bare "Label:" line is dropped).
function fillBanner(text, k) {
	const map = {
		'###DATE###':    formatDate(),
		'###YEAR###':    String(new Date().getFullYear()),
		'###PROJECT###': k.project || '',
		'###AUTHOR###':  k.author || '',
		'###EMAIL###':   k.email || '',
		'###REPO###':    k.repo || deriveRepo(k.baseurl),
		'###BASEURL###': k.baseurl || '',
	};
	let out = text;
	for (const [token, value] of Object.entries(map)) out = out.split(token).join(value);

	return out
		.split('\n')
		.map((line) => line.replace(/\s*<\s*>\s*$/, '').replace(/[ \t]+$/, ''))
		.filter((line) => !/^\s*[A-Za-z][\w .-]*:\s*$/.test(line))
		.join('\n');
}