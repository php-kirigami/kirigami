import fs from 'fs';
import path from "path";
import util from "util";
import Ajv from 'ajv';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';
import { walkFile } from "@kirigami/struct-walker";
import { formatFrDate } from "./utils.js";


const require = createRequire(import.meta.url);
const __project = process.cwd();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __configpath = path.join(__project, 'kirigami.yaml');

let config = null;
let schemaValidator = null;


export async function getConfig() {
	if(!config) {
		if (!fs.existsSync(__configpath)) throw `Config file not found: ${__configpath}`;
		const _config = await walkFile(__configpath);
		if(!_config) throw `Invalid config file: ${__configpath}`;
		validateAgainstSchema(_config);
		await validateConfig(_config);
		config = _config;
	}
	return config;
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
function validateAgainstSchema(_config) {
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
		throwConfigError(__configpath, `Schema validation failed:\n${details}`);
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


async function validateConfig(config) {
	const modules = [];

	// Verify kirigami section
	if(!config.kirigami) throwConfigError(__configpath, `Missing "kirigami" configuration section.`);

	// verify kirigami.project, kirigami.baseurl
	if(!config.kirigami.project) throwConfigError(__configpath, `Missing "kirigami:project" property.`);
	if(!config.kirigami.baseurl) throwConfigError(__configpath, `Missing "kirigami:baseurl" property.`);
	config.kirigami.baseurl = config.kirigami.baseurl.replace(/\/$/, '');

	// Verify root
	if(!config.kirigami.root) throwConfigError(__configpath, `Missing "kirigami:root" property.`);
	const __root = path.resolve(__project, config.kirigami.root);
	if (!fs.existsSync(__root)) throwConfigError(__configpath, `Invalid "kirigami:root" property.`);
	config.root = __root;

	// Verify banner. A `kirigami:banner` file is filled from the config; with no
	// file set, the bundled ASCII template is used the same way. `###DATE###`
	// (and the rest) are resolved here, on every build/export — the committed
	// banner.txt keeps its placeholders.
	if(config.kirigami.banner) {
		const bannerFile = path.join(__project, config.kirigami.banner);
		if (!fs.existsSync(bannerFile)) throwConfigError(__configpath, `Invalid "kirigami:banner" property.`);
		config.kirigami.banner = fillBanner(fs.readFileSync(bannerFile, 'utf8'), config.kirigami);
	} else {
		const tpl = path.join(__dirname, '..', 'assets', 'banner-template.txt');
		config.kirigami.banner = fs.existsSync(tpl)
			? fillBanner(fs.readFileSync(tpl, 'utf8'), config.kirigami)
			: `Exported by Kirigami: ${formatFrDate()}`;
	}

	// Verify image section
	if(!config.image) config.image = {};
	if(!config.image.format) config.image.format = 'webp';
	if(!config.image.source) config.image.source = 'assets/images/';
	if(!config.image.dest) config.image.dest = 'images/';

	// Verify tasks
	if(config.tasks) {
		await Promise.all(config.tasks.map(async task => {
			if(!task.type) throwConfigError(__configpath, `Invalid task type: ${util.inspect(task)}.`);
			if(!task.name) throwConfigError(__configpath, `Invalid task name: ${util.inspect(task)}.`);
			try {
				if(!modules[task.type]) {
					const taskPath = path.resolve(__dirname, "tasks", `${task.type}.js`);
					if (!fs.existsSync(taskPath)) throwConfigError(__configpath, `Unknown task type: ${util.inspect(task)}.`);
					modules[task.type] = await import(pathToFileURL(taskPath).href);
				}
				await modules[task.type].validate(__root, task);
			} catch(err) {
				throwConfigError(__configpath, typeof err == 'string' ? err : err.message);
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
		'###DATE###':    formatFrDate(),
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