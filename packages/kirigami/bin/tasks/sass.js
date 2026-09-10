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
import { getRepresentativeColors, imgasset } from '../libs/image.js';
import { run as runHook, HOOKS, Cache } from '@kirigami/sdk';


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
	const images = imgasset({
		format: imgFormat,
		sourceRoot: imgSourceRoot,
		destRoot: path.resolve(exportPath || __root, imgConfig.dest || './images/'),
		destRootSource: exportPath ? path.resolve(__root, imgConfig.dest || './images/') : null,
		outDir: dir,
	});

	try {
		const cache = new Map();

		const compileOptions = {
			style: "compressed",
			sourceMap: !exportPath,
			sourceMapIncludeSources: !exportPath,
			loadPaths: [path.resolve(process.cwd(), "./node_modules")],
			importers: [
				new sass.NodePackageImporter(),
				createPkgImporter([
					path.resolve(process.cwd(), "./node_modules"),
					getGlobalRoot()
				])
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
					const srcRelPath = args[0].assertString('path').text;
					const widthArg = args[1];
					const heightArg = args[2];
					const cover = args[3].isTruthy;

					const width = widthArg !== sass.sassNull ? Math.round(widthArg.assertNumber('width').value) : null;
					const height = heightArg !== sass.sassNull ? Math.round(heightArg.assertNumber('height').value) : null;

					// Output naming and source collection live in imgasset()
					// (see libs/image.js); here we just forward the params and
					// wrap the returned path in a CSS url(...) value.
					const url = images.ref(srcRelPath, { width, height, cover });
					return new sass.SassString(`url("${url}")`, { quotes: false });
				},

				'colors($path, $count: 5)': async (args) => {
					const srcRelPath = args[0].assertString('path').text;
					const count = Math.round(args[1].assertNumber('count').value);

					const absPath = path.resolve(imgSourceRoot, srcRelPath);
					const mtime = fs.statSync(absPath).mtimeMs;
					const cacheKey = `colors_${absPath}:${mtime}:${count}`;

					let hexColors = CACHE.get(cacheKey);
					if (!hexColors) {
						hexColors = await getRepresentativeColors(absPath, { numColors: count });
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

		const compiled = (beforeFiles.length || afterFiles.length)
			? await sass.compileStringAsync(
				buildSyntheticEntrySource(entry, beforeFiles, afterFiles),
				{ url: pathToFileURL(entry), ...compileOptions }
			)
			: await sass.compileAsync(entry, compileOptions);

		const newImages = await images.process();

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


function createPkgImporter(roots) {
	return {
		findFileUrl(url) {
			const match = url.match(/^(@[^/]+\/[^/]+)\/(.+)$/)
				|| url.match(/^([^/@][^/]*)\/(.+)$/);
			if (!match) return null;

			const [, pkgName, subPath] = match;

			for (const root of roots) {
				const pkgDir = path.join(root, pkgName);
				const pkgJsonPath = path.join(pkgDir, "package.json");

				if (!fs.existsSync(pkgJsonPath)) continue; // try the next root

				const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
				const exportsMap = pkgJson.exports;
				if (!exportsMap) continue;

				// candidates to try, in order: the subPath as-is, then the
				// same subPath prefixed with "styles/" (to support imports
				// like "@scope/pkg/init" in addition to
				// "@scope/pkg/styles/init")
				const candidates = [subPath, `styles/${subPath}`];

				let found = null;
				for (const [pattern, target] of Object.entries(exportsMap)) {
					const patternRe = new RegExp(
						"^" + pattern.replace("*", "(.+)").replace("./", "\\./") + "$"
					);
					for (const candidate of candidates) {
						const m = ("./" + candidate).match(patternRe);
						if (m) {
							const resolved = target.replace("*", m[1]);
							found = path.join(pkgDir, resolved);
							break;
						}
					}
					if (found) break;
				}
				if (found) {
					return new URL("file://" + found.replace(/\\/g, "/"));
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