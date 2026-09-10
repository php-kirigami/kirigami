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

	// Verify banner
	if(config.kirigami.banner) {
		const bannerFile = path.join(__project, config.kirigami.banner);
		if (!fs.existsSync(bannerFile)) throwConfigError(__configpath, `Invalid "kirigami:banner" property.`);
		config.kirigami.banner = fs.readFileSync(config.kirigami.banner, 'utf8').replace(/###DATE###/, formatFrDate());
	} else {
		config.kirigami.banner = `Exported by Kirigami: ${formatFrDate()}`;
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