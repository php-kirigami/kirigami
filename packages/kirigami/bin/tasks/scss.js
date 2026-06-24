import fs from 'fs'; 	
import path from "path";
import util from "util";
import * as sass from 'sass'
import { minify } from 'csso';
import { replaceRoot, joinWith, log, c } from '../utils.js';


export const taskname = 'SCSS';

export default async function build(__root, task, exportPath = null) {

	const entry = path.join(__root, task.entry);
	const outfile = path.join(exportPath || __root, task.entry).replace(/\.scss?$/, '.min.css');
	const dir = path.dirname(outfile);

	if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	try {
		const compiled = sass.compile(entry, {
			loadPaths: [path.resolve(process.cwd(), "./node_modules")],
			style: "compressed",
			sourceMap: !exportPath,
			sourceMapIncludeSources: !exportPath,
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