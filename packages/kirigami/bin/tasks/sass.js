import fs from 'fs'; 	
import path from "path";
import util from "util";
import sharp from 'sharp';
import * as sass from 'sass'
import { minify } from 'csso';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';
import { createRequire } from 'node:module';
import { replaceRoot, joinWith, log, c } from '../utils.js';


const __dirname = process.cwd();
const require = createRequire(import.meta.url);
const fontkit = require('fontkit');
const fontCache = new Map();
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
	const params = config.sass || {};
	const entry = path.join(__root, task.entry);
	const outfile = path.join(exportPath || __root, task.entry).replace(/\.s?css?$/, '.min.css');
	const dir = path.dirname(outfile);

	if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	// config.image.* : voir kirigami.config — source est relatif à cwd(),
	// dest est relatif à kirigami.src mais réécrit dans l'arbre de sortie
	// (exportPath || __root), en miroir de outfile/entry.
	const imgConfig = config.image || {};
	const imgFormat = imgConfig.format === 'avif' ? 'avif' : 'webp';
	const imgSourceRoot = path.resolve(process.cwd(), imgConfig.source || './assets/images/');
	const imgDestRoot = path.resolve(exportPath || __root, imgConfig.dest || './images/');

	try {
		const cache = new Map();
		const imageAssets = new Map(); // path retourné (utilisé dans le css) -> infos source pour le traitement post-compile
		const compiled = sass.compile(entry, {
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
					const font = getFont(abs);
					const [min, max] = axisRange(font, 'wght', [400, 400]);
					return new sass.SassString(`${min} ${max}`);
				},

				'font-stretch-range($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					const font = getFont(abs);
					const [min, max] = axisRange(font, 'wdth', [100, 100]);
					return new sass.SassString(`${min}% ${max}%`);
				},

				'font-unicode-range($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					const font = getFont(abs);
					return new sass.SassString(buildUnicodeRange(font.characterSet));
				},

				'font-format($path)': (args) => {
					const abs = resolveFontPath(args[0].assertString('path').text);
					return new sass.SassString(getFormatKeyword(abs));
				},

				'font-style-detect($path)': (args) => {
				const abs = resolveFontPath(args[0].assertString('path').text);
					const font = getFont(abs);
					return new sass.SassString(detectFontStyle(font));
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
					if (hasWidth && hasHeight) {
						suffix = cover ? `-${width}x${height}-cover` : `-${width}x${height}`;
					} else if (hasWidth) {
						suffix = `-${width}w`;
					} else if (hasHeight) {
						suffix = `-${height}h`;
					}

					const { dir: subDir, name } = path.parse(srcRelPath);
					const outRelPath = (subDir ? `${subDir}/` : '') + `${name}${suffix}.${imgFormat}`;
					const destAbsPath = path.join(imgDestRoot, outRelPath);

					const returned = path.relative(path.dirname(outfile), destAbsPath).split(path.sep).join('/');

					if (!imageAssets.has(destAbsPath)) {
						imageAssets.set(destAbsPath, {
							src: path.resolve(imgSourceRoot, srcRelPath),
							width,
							height,
							cover,
						});
					}

					// Retourne directement une valeur CSS url(...)
					return new sass.SassString(`url("${returned}")`, { quotes: false });
				},

			},
			...params
		});

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
	const font = fontkit.openSync(absPath);
	fontCache.set(key, font);
	return font;
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
// convertit chaque source dans le format configuré (webp ou avif), à
// l'emplacement absolu calculé pour chaque entrée. Sauté si la sortie
// est déjà à jour par rapport à la source.
// ---------------------------------------------------------------------------
async function processImageAssets(imageAssets, format) {
	const newImages = [];
	await Promise.all([...imageAssets.entries()].map(async ([dest, { src, width, height, cover }]) => {
		if (!fs.existsSync(src)) {
			throw new Error(`img-asset: fichier source introuvable: ${src}`);
		}

		if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
			return; // déjà à jour
		}
		newImages.push(replaceRoot(dest));
		const destDir = path.dirname(dest);
		if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

		let pipeline = sharp(src);
		if (width && height) {
			pipeline = pipeline.resize(width, height, { fit: cover ? 'cover' : 'inside', withoutEnlargement: !cover });
		} else if (width) {
			pipeline = pipeline.resize({ width });
		} else if (height) {
			pipeline = pipeline.resize({ height });
		} // ni width ni height: pas de resize, juste réencodage dans le format cible

		await pipeline[format](IMG_FORMAT_OPTIONS[format]).toFile(dest);
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