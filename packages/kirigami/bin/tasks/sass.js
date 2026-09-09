import fs from 'fs'; 	
import path from "path";
import util from "util";
import sharp from 'sharp';
import * as sass from 'sass'
import { minify } from 'csso';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { replaceRoot, joinWith, log, c } from '../utils.js';
import { getRepresentativeColors } from '../libs/colors.js';
import * as CACHE from '../libs/cache.js';
import { run as runHook, HOOKS } from '@kirigami/sdk';


const __dirname = process.cwd();
const require = createRequire(import.meta.url);
const fontkit = require('fontkit');
const fontCache = new Map(); // cache mémoire du résultat intermédiaire (plain object) pour éviter de retaper CACHE à chaque appel dans le même process
const FORMAT_KEYWORDS = {
	woff2: 'woff2',
	woff:  'woff',
	ttf:   'truetype',
	otf:   'opentype',
	eot:   'embedded-opentype',
	svg:   'svg',
};

// ---------------------------------------------------------------------------
// Options d'encodage par format pour img-asset(). Le format lui-même, le
// dossier des images sources et le dossier de destination viennent de
// config.image (voir kirigami.config), pas d'ici.
// ---------------------------------------------------------------------------
const IMG_FORMAT_OPTIONS = {
	webp: { quality: 82 },
	avif: { quality: 50 }, // l'échelle de qualité avif n'est pas la même que webp
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

	// config.sass.before / config.sass.after : fichiers additionnels compilés
	// respectivement avant et après l'entry (chemins relatifs à cwd()).
	// Le hook 'sass:before' / 'sass:after' permet à d'autres modules (à terme,
	// le système de plugins lu depuis kirigami.yaml) de contribuer des
	// fichiers supplémentaires — chaque listener peut renvoyer un chemin
	// (absolu de préférence, ex: résolu depuis son propre package) ou un
	// tableau de chemins. Voir buildSyntheticEntrySource() pour l'assemblage.
	// Le hook 'sass:functions' permet d'ajouter des fonctions Sass custom, au
	// même titre que inline-file()/img-asset()/etc. plus bas — chaque listener
	// renvoie un objet { 'ma-fonction($arg)': (args) => ... }, au même format
	// que l'argument `functions` de l'API Sass.
	const hookContext = { __root, task, exportPath, config };
	const [hookBefore, hookAfter, hookFunctions] = await Promise.all([
		runHook(HOOKS.SASS_BEFORE, hookContext),
		runHook(HOOKS.SASS_AFTER, hookContext),
		runHook(HOOKS.SASS_FUNCTIONS, hookContext),
	]);
	const beforeFiles = [...[].concat(before), ...hookBefore].filter(Boolean).map((p) => path.resolve(process.cwd(), p));
	const afterFiles = [...[].concat(after), ...hookAfter].filter(Boolean).map((p) => path.resolve(process.cwd(), p));
	const pluginFunctions = Object.assign({}, ...hookFunctions); // objets { signature: fn } fusionnés

	// config.image.* : voir kirigami.config — source est relatif à cwd(),
	// dest est relatif à kirigami.src mais réécrit dans l'arbre de sortie
	// (exportPath || __root), en miroir de outfile/entry.
	const imgConfig = config.image || {};
	const imgFormat = imgConfig.format === 'avif' ? 'avif' : 'webp';
	const imgSourceRoot = path.resolve(process.cwd(), imgConfig.source || './assets/images/');
	const imgDestRoot = path.resolve(exportPath || __root, imgConfig.dest || './images/');
	// Lors d'un export, l'image traitée doit atterrir à la fois dans l'arbre
	// exporté (imgDestRoot ci-dessus) et dans l'arbre source (__root), pour
	// que ce dernier reste à jour aussi (dev/watch). Hors export, imgDestRoot
	// pointe déjà sur __root, donc rien à dupliquer.
	const imgDestRootSource = exportPath ? path.resolve(__root, imgConfig.dest || './images/') : null;

	try {
		const cache = new Map();
		const imageAssets = new Map(); // path retourné (utilisé dans le css) -> infos source pour le traitement post-compile

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
				// Fonctions ajoutées par des plugins (hook 'sass:functions').
				// Placées en premier : si un plugin réutilise par erreur une
				// signature déjà native (inline-file, img-asset, etc.), la
				// version native ci-dessous l'emporte toujours.
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

					const hasWidth = widthArg !== sass.sassNull;
					const hasHeight = heightArg !== sass.sassNull;
					const width = hasWidth ? Math.round(widthArg.assertNumber('width').value) : null;
					const height = hasHeight ? Math.round(heightArg.assertNumber('height').value) : null;

					let suffix = '';
					if (hasWidth && hasHeight) suffix = cover ? `-${width}x${height}-cover` : `-${width}x${height}`;
					else if (hasWidth) suffix = `-${width}w`;
					else if (hasHeight) suffix = `-${height}h`;

					const { dir: subDir, name } = path.parse(srcRelPath);
					const outRelPath = (subDir ? `${subDir}/` : '') + `${name}${suffix}.${imgFormat}`;
					const destAbsPath = path.join(imgDestRoot, outRelPath);
					const destAbsPathSource = imgDestRootSource ? path.join(imgDestRootSource, outRelPath) : null;

					const returned = path.relative(path.dirname(outfile), destAbsPath).split(path.sep).join('/');

					if (!imageAssets.has(destAbsPath)) {
						imageAssets.set(destAbsPath, {
							src: path.resolve(imgSourceRoot, srcRelPath),
							width,
							height,
							cover,
							extraDest: destAbsPathSource,
						});
					}

					// Retourne directement une valeur CSS url(...)
					return new sass.SassString(`url("${returned}")`, { quotes: false });
				},

				'colors($path, $count: 5)': async (args) => {
					const srcRelPath = args[0].assertString('path').text;
					const count = Math.round(args[1].assertNumber('count').value);

					const absPath = path.resolve(imgSourceRoot, srcRelPath);
					const mtime = fs.statSync(absPath).mtimeMs;
					const cacheKey = `colors:${absPath}:${mtime}:${count}`;

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

		const newImages = await processImageAssets(imageAssets, imgFormat);

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
// Assemble un point d'entrée synthétique qui @use avant/après l'entry
// réelle, dans cet ordre. On ne peut pas concaténer le texte brut des
// fichiers (les @use/@forward doivent être en tête de fichier, avant toute
// règle CSS), donc chaque fichier est chargé comme son propre module ; le
// module system de Sass émet le CSS de chaque module dans l'ordre où il est
// @use pour la première fois, ce qui donne exactement l'ordre before → entry
// → after dans le CSS compilé. Le namespace de chaque @use n'a pas
// d'importance ici (rien ne le référence), juste besoin qu'il soit unique.
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

				if (!fs.existsSync(pkgJsonPath)) continue; // essaie la racine suivante

				const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
				const exportsMap = pkgJson.exports;
				if (!exportsMap) continue;

				// candidats à tester, dans l'ordre : le subPath tel quel,
				// puis le même subPath préfixé par "styles/" (pour supporter
				// les imports du type "@scope/pkg/init" en plus de
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

	const cacheKey = `font:${key}`;
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
// L'objet Font de fontkit (buffers, getters, méthodes sur le prototype)
// n'est pas sérialisable en JSON : on ne peut donc pas le stocker tel quel
// dans CACHE (persisté en SQLite via JSON.stringify, voir libs/cache.js).
// On calcule donc une seule fois toutes les propriétés dérivées dont les
// fonctions Sass ont besoin, sous forme de données simples, et c'est ce
// résultat intermédiaire (plain object) qui est mis en cache et réutilisé.
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
// Unicode-range : fusionne les code points couverts par la police en plages
// contiguës, format CSS (U+XXXX-YYYY)
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


// ---------------------------------------------------------------------------
// Traite la map d'images collectée par img-asset() : redimensionne et
// convertit chaque source dans le format configuré (webp ou avif). Chaque
// entrée peut avoir jusqu'à deux destinations (l'arbre exporté et, lors d'un
// export, l'arbre source) : le traitement n'a lieu qu'une fois, et le
// résultat est écrit vers celles qui ne sont pas déjà à jour.
// ---------------------------------------------------------------------------
async function processImageAssets(imageAssets, format) {
	const newImages = [];
	await Promise.all([...imageAssets.entries()].map(async ([dest, { src, width, height, cover, extraDest }]) => {
		if (!fs.existsSync(src)) {
			throw new Error(`img-asset: fichier source introuvable: ${src}`);
		}

		const srcMtime = fs.statSync(src).mtimeMs;
		const dests = [dest, extraDest].filter(Boolean);
		const staleDests = dests.filter((d) => !fs.existsSync(d) || fs.statSync(d).mtimeMs < srcMtime);

		if (!staleDests.length) return; // tout est déjà à jour

		let pipeline = sharp(src);
		if (width && height) {
			pipeline = pipeline.resize(width, height, { fit: cover ? 'cover' : 'inside', withoutEnlargement: !cover });
		} else if (width) {
			pipeline = pipeline.resize({ width });
		} else if (height) {
			pipeline = pipeline.resize({ height });
		} // ni width ni height: pas de resize, juste réencodage dans le format cible

		const buffer = await pipeline[format](IMG_FORMAT_OPTIONS[format]).toBuffer();

		await Promise.all(staleDests.map(async (d) => {
			const destDir = path.dirname(d);
			if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
			await fs.promises.writeFile(d, buffer);
			newImages.push(replaceRoot(d));
		}));
	}));
	return newImages;
}


function getFormatKeyword(absPath) {
	const ext = path.extname(absPath).slice(1).toLowerCase();
	return FORMAT_KEYWORDS[ext] ?? ext; // fallback: renvoie l'extension telle quelle
}



function detectFontStyle(font) {
	const axes = font.variationAxes || {};

	// Cas 2 : axe slnt (slant continu)
	if (axes.slnt) {
		// Convention OpenType (slnt) et CSS (oblique deg) ont un signe opposé
		const min = -axes.slnt.max;
		const max = -axes.slnt.min;
		if (min === 0 && max === 0) return 'normal';
		return `oblique ${min}deg ${max}deg`;
	}

	// Cas 3 : axe ital (binaire) — signalé pour gestion à part, voir plus bas
	if (axes.ital) {
		return 'ital-axis'; // valeur sentinelle, pas une vraie valeur CSS
	}

	// Cas 1 : police statique — on regarde italicAngle puis le nom du sous-style
	if (font.italicAngle && font.italicAngle !== 0) return 'italic';

	const subfamily = (font.subfamilyName || '').toLowerCase();
	if (subfamily.includes('italic')) return 'italic';
	if (subfamily.includes('oblique')) return 'oblique';

	return 'normal';
}