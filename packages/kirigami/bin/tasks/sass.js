import fs from 'fs'; 	
import path from "path";
import util from "util";
import * as sass from 'sass'
import { minify } from 'csso';
import { getConfig } from '../config.js';
import { execSync } from 'child_process';
import { replaceRoot, joinWith, log, c } from '../utils.js';


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

	try {
		const compiled = sass.compile(entry, {
			loadPaths: [path.resolve(process.cwd(), "./node_modules")],
			importers: [
				new sass.NodePackageImporter(),
				createPkgImporter([
					path.resolve(process.cwd(), "./node_modules"),
					getGlobalRoot()
				])
			],
			style: "compressed",
			sourceMap: !exportPath,
			sourceMapIncludeSources: !exportPath,
			...params
		});
		
		if(exportPath) {
			const minified = minify(compiled.css, { restructure: false });
			fs.writeFileSync(outfile, `/*!\n\n${task.banner}\n\n*/\n${minified.css}`, "utf8");
			return {
				success: true,
				files: [replaceRoot(outfile)],
			};
		} else {
			const mapfile = outfile.replace(/\.css$/, '.css.map');
			const mapBasename = path.basename(mapfile);
			const cssWithMap = `${compiled.css}\n/*# sourceMappingURL=${mapBasename} */`;
			fs.writeFileSync(outfile, cssWithMap);
			fs.writeFileSync(mapfile, JSON.stringify(compiled.sourceMap));
			return {
				success: true,
				files: [replaceRoot(outfile), replaceRoot(mapfile)],
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

				for (const [pattern, target] of Object.entries(exportsMap)) {
					const patternRe = new RegExp(
						"^" + pattern.replace("*", "(.+)").replace("./", "\\./") + "$"
					);
					const m = ("./" + subPath).match(patternRe);
					if (m) {
						const resolved = target.replace("*", m[1]);
						const finalPath = path.join(pkgDir, resolved);
						return new URL("file://" + finalPath.replace(/\\/g, "/"));
					}
				}
			}
			return null;
		}
	};
}