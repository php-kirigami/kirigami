import fs from 'fs';
import path from "path";
import util from "util";
import * as sass from 'sass'
import { minify } from 'csso';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { replaceRoot, joinWith, log, c } from '../utils.js';
import { run as runHook, HOOKS, Cache } from '@kirigami/sdk';


// @kirigami/php-prepros is loaded lazily (dynamic import) the first time an
// image job actually needs it: a pure-CSS sass task with no img-asset()/colors()
// call never starts the PHP/WASM runtime.
let _prepros;
async function getPrepros() {
	if (!_prepros) _prepros = await import('@kirigami/php-prepros');
	return _prepros;
}

// img-asset()/colors() encoder quality per output format — kept here (one place)
// and forwarded to IMG::save() on the PHP side.
const IMG_QUALITY = { webp: 82, avif: 50 };

// Output filename for a generated image: source name + a dimension suffix +
// the target extension. Must stay identical to IMG::asset() on the PHP side.
function imageOutName(srcRelPath, { width, height, cover }, format) {
	let suffix = '';
	if (width && height) suffix = cover ? `-${width}x${height}-cover` : `-${width}x${height}`;
	else if (width) suffix = `-${width}w`;
	else if (height) suffix = `-${height}h`;
	const { dir: subDir, name } = path.parse(srcRelPath);
	return (subDir ? `${subDir}/` : '') + `${name}${suffix}.${format}`;
}

function toVirtualPath(absPath) {
	return '/project/' + path.relative(process.cwd(), absPath).split(path.sep).join('/');
}


const __dirname = process.cwd();
const require = createRequire(import.meta.url);
const fontkit = require('fontkit');
const fontCache = new Map(); // in-memory cache of the intermediate result (plain object) to avoid hitting CACHE again on every call within the same process
// kirigami-core's default cache instance (representative colors, font
// metadata, etc.), a .node.db file at the cwd root — see @kirigami/sdk for the
// implementation (node:sqlite) and to spin up its own Cache if needed (e.g. in
// a plugin).
const CACHE = new Cache();
const FORMAT_KEYWORDS = {
	woff2: 'woff2',
	woff:  'woff',
	ttf:   'truetype',
	otf:   'opentype',
	eot:   'embedded-opentype',
	svg:   'svg',
};

export const taskname = 'SASS';
export const canwatch = true;
export const canbuild = true;


export default async function build(__root, task, exportPath = null) {
	const config = await getConfig();
	const { before = [], after = [], ...params } = config.sass || {};
	const entry = path.join(__root, task.entry);
	const outfile = path.join(exportPath || __root, task.entry).replace(/\.s?css?$/, '.min.css');
	const dir = path.dirname(outfile);

	if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	// config.sass.before / config.sass.after: extra files compiled respectively
	// before and after the entry (paths relative to cwd()).
	// The 'sass:before' / 'sass:after' hook lets other modules (eventually the
	// plugin system read from kirigami.yaml) contribute extra files — each
	// listener can return a path (preferably absolute, e.g. resolved from its
	// own package) or an array of paths. See buildSyntheticEntrySource() for
	// the assembly.
	// The 'sass:functions' hook lets you add custom Sass functions, just like
	// inline-file()/img-asset()/etc. below — each listener returns an object
	// { 'my-function($arg)': (args) => ... }, in the same format as the Sass
	// API `functions` argument.
	const hookContext = { __root, task, exportPath, config };
	const [hookBefore, hookAfter, hookFunctions] = await Promise.all([
		runHook(HOOKS.SASS_BEFORE, hookContext),
		runHook(HOOKS.SASS_AFTER, hookContext),
		runHook(HOOKS.SASS_FUNCTIONS, hookContext),
	]);
	const beforeFiles = [...[].concat(before), ...hookBefore].filter(Boolean).map((p) => path.resolve(process.cwd(), p));
	const afterFiles = [...[].concat(after), ...hookAfter].filter(Boolean).map((p) => path.resolve(process.cwd(), p));
	const pluginFunctions = Object.assign({}, ...hookFunctions); // merged { signature: fn } objects

	// config.image.*: see kirigami.config — source is relative to cwd(), dest
	// is relative to kirigami.src but rewritten into the output tree
	// (exportPath || __root), mirroring outfile/entry.
	const imgConfig = config.image || {};
	const imgFormat = imgConfig.format === 'avif' ? 'avif' : 'webp';
	const imgSourceRoot = path.resolve(process.cwd(), imgConfig.source || './assets/images/');
	const imgDestRoot = path.resolve(exportPath || __root, imgConfig.dest || './images/');
	// On export the images are written straight into the dist tree (the `dist`
	// task already ran) AND back into the source tree, so it stays current for
	// the next incremental build / watch.
	const imgDestRootSource = exportPath ? path.resolve(__root, imgConfig.dest || './images/') : null;

	// img-asset() collects its work here (deduped by output path); the actual
	// resize/encode runs once, after compilation, through @kirigami/php-prepros
	// (the IMG class — GD + Imagick — same engine as IMG::asset()/<img asset>).
	const imageJobs = new Map();

	// Resolve every collected job to a stale-only resize job list and run the
	// batch. Returns the project-relative paths of the files actually written.
	async function processCollectedImages() {
		const jobs = [];
		for (const job of imageJobs.values()) {
			const srcAbs = path.resolve(imgSourceRoot, job.srcRelPath);
			if (!fs.existsSync(srcAbs)) throw new Error(`img-asset: source file not found: ${srcAbs}`);
			const srcMtime = fs.statSync(srcAbs).mtimeMs;
			const staleDests = job.dests.filter((d) => !fs.existsSync(d) || fs.statSync(d).mtimeMs < srcMtime);
			if (!staleDests.length) continue; // every destination already up to date
			jobs.push({
				op: 'resize',
				src: job.srcRelPath,
				width: job.width || 0,
				height: job.height || 0,
				cover: !!job.cover,
				quality: IMG_QUALITY[imgFormat] ?? 82,
				dests: staleDests.map(toVirtualPath),
			});
		}
		if (!jobs.length) return [];
		const { processImages } = await getPrepros();
		const result = await processImages(jobs);
		if (!result.success) throw new Error(result.error || 'img-asset: image processing failed');
		return (result.files || []).filter((f) => !f.endsWith('.db'));
	}

	try {
		const cache = new Map();

		const compileOptions = {
			style: "compressed",
			sourceMap: !exportPath,
			sourceMapIncludeSources: !exportPath,
			loadPaths: [path.resolve(process.cwd(), "./node_modules")],
			importers: [
				new sass.NodePackageImporter(),
				createPkgImporter()
			],
			functions: {
				// Functions added by plugins (the 'sass:functions' hook).
				// Placed first: if a plugin accidentally reuses a signature
				// that's already native (inline-file, img-asset, etc.), the
				// native version below always wins.
				...pluginFunctions,

				'inline-file($path)': (args) => {
					const filePath = args[0].assertString("path").text;
					if (cache.has(filePath)) return cache.get(filePath);
					const resolvedPath = path.resolve(process.cwd(), filePath);
					const content = fs.readFileSync(resolvedPath);
					const result = new sass.SassString(
						`url("data:${guessMimeType(resolvedPath)};base64,${content.toString("base64")}")`,
						{ quotes: false }
					);
					cache.set(filePath, result);
					return result;
				},

				'font-weight-range($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					return new sass.SassString(getFont(abs).weightRange);
				},

				'font-stretch-range($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					return new sass.SassString(getFont(abs).stretchRange);
				},

				'font-unicode-range($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					return new sass.SassString(getFont(abs).unicodeRange);
				},

				'font-format($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					return new sass.SassString(getFormatKeyword(abs));
				},

				'font-style-detect($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					return new sass.SassString(getFont(abs).style);
				},

				'img-asset($path, $width: null, $height: null, $cover: false)': (args) => {
					const srcRelPath = args[0].assertString('path').text.replace(/\\/g, '/');
					const widthArg = args[1];
					const heightArg = args[2];
					const cover = args[3].isTruthy;

					const width = widthArg !== sass.sassNull ? Math.round(widthArg.assertNumber('width').value) : null;
					const height = heightArg !== sass.sassNull ? Math.round(heightArg.assertNumber('height').value) : null;

					// Predict the output name synchronously (same rule as
					// IMG::asset()), record the job, and return the CSS url().
					// The encode runs later in processCollectedImages().
					const outRel = imageOutName(srcRelPath, { width, height, cover }, imgFormat);
					const destAbs = path.join(imgDestRoot, outRel);
					if (!imageJobs.has(destAbs)) {
						const destAbsSource = imgDestRootSource ? path.join(imgDestRootSource, outRel) : null;
						imageJobs.set(destAbs, {
							srcRelPath,
							width,
							height,
							cover,
							dests: [destAbs, destAbsSource].filter(Boolean),
						});
					}
					const url = path.relative(dir, destAbs).split(path.sep).join('/');
					return new sass.SassString(`url("${url}")`, { quotes: false });
				},

				'colors($path, $count: 5)': async (args) => {
					const srcRelPath = args[0].assertString('path').text.replace(/\\/g, '/');
					const count = Math.round(args[1].assertNumber('count').value);

					const absPath = path.resolve(imgSourceRoot, srcRelPath);
					if (!fs.existsSync(absPath)) throw new Error(`colors: source file not found: ${absPath}`);
					const mtime = fs.statSync(absPath).mtimeMs;
					const cacheKey = `colors_${absPath}:${mtime}:${count}`;

					let hexColors = CACHE.get(cacheKey);
					if (!hexColors) {
						// Cache miss: extract the palette through IMG::palette()
						// (GD, same engine as everything else). The PHP runtime
						// boots here only if it wasn't already needed.
						const { processImages } = await getPrepros();
						const result = await processImages([{ op: 'palette', src: srcRelPath, count }]);
						if (!result.success) throw new Error(result.error || `colors: palette extraction failed for ${srcRelPath}`);
						hexColors = result.colors[`${srcRelPath}:${count}`] || [];
						CACHE.set(cacheKey, hexColors);
					}

					const sassColors = hexColors.map((hex) => new sass.SassColor({
						red: parseInt(hex.slice(1, 3), 16),
						green: parseInt(hex.slice(3, 5), 16),
						blue: parseInt(hex.slice(5, 7), 16),
					}));

					return new sass.SassList(sassColors, { separator: ',' });
				},

			},
			...params
		};

		// The synthetic entry lives (virtually) in the real entry's directory
		// so its relative @use "./entry.scss" resolves — but under its own
		// filename, otherwise Sass sees the entry @use'ing itself ("module
		// loop: already being loaded").
		const syntheticUrl = pathToFileURL(path.join(path.dirname(entry), '__kirigami_entry__.scss'));
		const compiled = (beforeFiles.length || afterFiles.length)
			? await sass.compileStringAsync(
				buildSyntheticEntrySource(entry, beforeFiles, afterFiles),
				{ url: syntheticUrl, ...compileOptions }
			)
			: await sass.compileAsync(entry, compileOptions);

		const newImages = await processCollectedImages();

		if(exportPath) {
			const minified = minify(compiled.css, { restructure: false });
			fs.writeFileSync(outfile, `/*!\n\n${task.banner}\n\n*/\n${minified.css}`, "utf8");
			return {
				success: true,
				files: [replaceRoot(outfile), ...newImages],
			};
		} else {
			const mapfile = outfile.replace(/\.css$/, '.css.map');
			const mapBasename = path.basename(mapfile);
			const cssWithMap = `${compiled.css}\n/*# sourceMappingURL=${mapBasename} */`;
			fs.writeFileSync(outfile, cssWithMap);
			fs.writeFileSync(mapfile, JSON.stringify(compiled.sourceMap));
			return {
				success: true,
				files: [replaceRoot(outfile), replaceRoot(mapfile), ...newImages],
			};
		}
	} catch (err) {
		return {
			success: false,
			error: err?.formatted || err?.message || err,
		};
	}

}


export async function validate(__root, task) {
	if(!task.entry) throw `Missing entry property for task: ${util.inspect(task)}`;
	if(!fs.existsSync(path.join(__root, task.entry))) throw `Invalid entry property for task: ${util.inspect(task)}`;
}


export function getWatcher(__root, task) {
	const root = __root.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
	const dir = joinWith(root, path.dirname(task.entry));
	const patterns = [joinWith(dir, '**/*.scss')]
	return {
		name: task.name,
		patterns: patterns,
		callback: async (events) => {
			if(!events.filter(e => e.type != 'add').length) return;
			console.log(`[${task.name}] batch`, events.length, events.map(e => e.file));
			const results = await build(__root, task);
			if(results.success) {
				results.files.forEach(f => log.step(f));
			} else {
				log.error(c.red('Error: '));
				console.log(results.error);
			}
			console.log("");
		}
	};
}


let _globalRoot;
function getGlobalRoot() {
	if (!_globalRoot) {
		_globalRoot = execSync("npm root -g").toString().trim();
	}
	return _globalRoot;
}


// ---------------------------------------------------------------------------
// Builds a synthetic entry point that @use's the files before/after the real
// entry, in that order. We can't concatenate the raw text of the files
// (@use/@forward must be at the top of the file, before any CSS rule), so each
// file is loaded as its own module; Sass's module system emits each module's
// CSS in the order it's first @use'd, which gives exactly the order
// before → entry → after in the compiled CSS. Each @use's namespace doesn't
// matter here (nothing references it), it just has to be unique.
// ---------------------------------------------------------------------------
function buildSyntheticEntrySource(entryAbsPath, beforeFiles, afterFiles) {
	const baseDir = path.dirname(entryAbsPath);
	const asModuleUrl = (absPath) => {
		let rel = path.relative(baseDir, absPath).split(path.sep).join('/');
		if (!rel.startsWith('.')) rel = `./${rel}`;
		return rel;
	};

	const lines = [
		...beforeFiles.map((f, i) => `@use "${asModuleUrl(f)}" as __before_${i};`),
		`@use "${asModuleUrl(entryAbsPath)}" as __entry;`,
		...afterFiles.map((f, i) => `@use "${asModuleUrl(f)}" as __after_${i};`),
	];

	return lines.join('\n') + '\n';
}


// ---------------------------------------------------------------------------
// Resolves the directory of an npm package by name, the way Node itself would
// (so symlinks / npm link / pnpm / workspace hoisting all work), trying both
// the project's resolution and kiri's own — the latter catches a globally
// installed kiri whose plugins are global siblings. Falls back to a plain
// join against ./node_modules and `npm root -g`.
// ---------------------------------------------------------------------------
function resolvePackageDir(pkgName) {
	for (const from of [path.join(process.cwd(), "index.js"), import.meta.url]) {
		try {
			const req = createRequire(from);
			// Prefer the manifest entry (every package that ships styles via
			// `exports` exposes ./package.json too); fall back to the main entry.
			let pkgJson;
			try {
				pkgJson = req.resolve(`${pkgName}/package.json`);
			} catch {
				pkgJson = path.join(req.resolve(pkgName), "..", "package.json");
			}
			if (fs.existsSync(pkgJson)) return path.dirname(pkgJson);
		} catch { /* try the next resolution base */ }
	}
	for (const root of [path.resolve(process.cwd(), "./node_modules"), getGlobalRoot()]) {
		const dir = path.join(root, pkgName);
		if (fs.existsSync(path.join(dir, "package.json"))) return dir;
	}
	return null;
}


function createPkgImporter() {
	return {
		findFileUrl(url) {
			const match = url.match(/^(@[^/]+\/[^/]+)\/(.+)$/)
				|| url.match(/^([^/@][^/]*)\/(.+)$/);
			if (!match) return null;

			const [, pkgName, subPath] = match;

			const pkgDir = resolvePackageDir(pkgName);
			if (!pkgDir) return null;

			const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, "package.json"), "utf8"));
			const exportsMap = pkgJson.exports;
			if (!exportsMap) return null;

			// candidates to try, in order: the subPath as-is, then the same
			// subPath prefixed with "styles/" (so "@scope/pkg/init" works as
			// well as "@scope/pkg/styles/init")
			const candidates = [subPath, `styles/${subPath}`];

			for (const [pattern, target] of Object.entries(exportsMap)) {
				if (typeof target !== "string") continue;
				const patternRe = new RegExp(
					"^" + pattern.replace("*", "(.+)").replace("./", "\\./") + "$"
				);
				for (const candidate of candidates) {
					const m = ("./" + candidate).match(patternRe);
					if (m) {
						const resolved = target.replace("*", m[1] ?? "");
						return new URL("file://" + path.join(pkgDir, resolved).replace(/\\/g, "/"));
					}
				}
			}
			return null;
		}
	};
}


function guessMimeType(filePath) {
	const ext = path.extname(filePath).toLowerCase();
	const map = {
		".png":   "image/png",
		".jpg":   "image/jpeg",
		".jpeg":  "image/jpeg",
		".webp":  "image/webp",
		".avif":  "image/avif",
		".svg":   "image/svg+xml",
		".woff":  "font/woff",
		".woff2": "font/woff2"
	};
	return map[ext] || "application/octet-stream";
}


function getFont(absPath) {
	const mtime = fs.statSync(absPath).mtimeMs;
	const key = `${absPath}:${mtime}`;

	if (fontCache.has(key)) return fontCache.get(key);

	const cacheKey = `font_${key}`;
	let data = CACHE.get(cacheKey);
	if (data === null) {
		const font = fontkit.openSync(absPath);
		data = computeFontData(font);
		CACHE.set(cacheKey, data);
	}

	fontCache.set(key, data);
	return data;
}

// ---------------------------------------------------------------------------
// fontkit's Font object (buffers, getters, prototype methods) is not
// JSON-serializable: we therefore can't store it as-is in CACHE (persisted to
// SQLite via JSON.stringify, see @kirigami/sdk). So we compute once all the
// derived properties the Sass functions need, as plain data, and it's that
// intermediate result (a plain object) that gets cached and reused.
// ---------------------------------------------------------------------------
function computeFontData(font) {
	const [weightMin, weightMax] = axisRange(font, 'wght', [400, 400]);
	const [stretchMin, stretchMax] = axisRange(font, 'wdth', [100, 100]);

	return {
		weightRange: `${weightMin} ${weightMax}`,
		stretchRange: `${stretchMin}% ${stretchMax}%`,
		unicodeRange: buildUnicodeRange(font.characterSet),
		style: detectFontStyle(font),
	};
}


function resolveFontPath(relPath) {
	return path.resolve(__dirname, relPath);
}


function axisRange(font, tag, fallback) {
	const axis = font.variationAxes[tag];
	if (!axis) return fallback;
	return [axis.min, axis.max];
}

// ---------------------------------------------------------------------------
// Unicode-range: merges the code points covered by the font into contiguous
// ranges, CSS format (U+XXXX-YYYY)
// ---------------------------------------------------------------------------
function buildUnicodeRange(codepoints) {
	const sorted = [...codepoints].sort((a, b) => a - b);
	if (sorted.length === 0) return '';

	const ranges = [];
	let start = sorted[0];
	let prev = sorted[0];

	for (const cp of sorted.slice(1)) {
		if (cp === prev + 1) {
			prev = cp;
			continue;
		}
		ranges.push([start, prev]);
		start = prev = cp;
	}
	ranges.push([start, prev]);

	return ranges
		.map(([a, b]) =>
			a === b
				? `U+${a.toString(16).toUpperCase()}`
				: `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`
		)
		.join(', ');
}


function getFormatKeyword(absPath) {
	const ext = path.extname(absPath).slice(1).toLowerCase();
	return FORMAT_KEYWORDS[ext] ?? ext; // fallback: return the extension as-is
}



function detectFontStyle(font) {
	const axes = font.variationAxes || {};

	// Case 2: slnt axis (continuous slant)
	if (axes.slnt) {
		// The OpenType (slnt) and CSS (oblique deg) conventions have opposite signs
		const min = -axes.slnt.max;
		const max = -axes.slnt.min;
		if (min === 0 && max === 0) return 'normal';
		return `oblique ${min}deg ${max}deg`;
	}

	// Case 3: ital axis (binary) — flagged for separate handling, see below
	if (axes.ital) {
		return 'ital-axis'; // sentinel value, not a real CSS value
	}

	// Case 1: static font — look at italicAngle then the subfamily name
	if (font.italicAngle && font.italicAngle !== 0) return 'italic';

	const subfamily = (font.subfamilyName || '').toLowerCase();
	if (subfamily.includes('italic')) return 'italic';
	if (subfamily.includes('oblique')) return 'oblique';

	return 'normal';
}