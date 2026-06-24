import fs from 'fs'; 	
import path from "path";
import util from "util";
import esbuild from "esbuild";
import { replaceRoot } from '../utils.js';


export const taskname = 'Javascript';

export default async function build(__root, task, exportPath = null) {

	const entry = path.join(__root, task.entry);
	const outfile = path.join(exportPath || __root, task.entry).replace(/\.jsx?$/, '.min.js');
	const dir = path.dirname(outfile);

	if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	try {
		await esbuild.build({
			entryPoints: [entry],
			outfile,
			bundle: true,
			platform: "browser",
			logLevel: "error",
			treeShaking: true,
			minify: true,
			supported: { "template-literal": false },
			target: ["es2020"],
			legalComments: "none",
			loader: { '.json': 'json' },
			sourcemap: !exportPath,
		});
		if(exportPath) {
			fs.writeFileSync(
				outfile,
				"/*!\n\n" + task.banner + "\n\n*/\n" +
				fs.readFileSync(outfile, 'utf8'),
				"utf8"
			);
		}
		return {
			success: true,
			files: exportPath ? [replaceRoot(outfile)] : [replaceRoot(outfile), `${replaceRoot(outfile)}.map`],
		};
	} catch (err) {
		let msg = err;
		if (err?.errors?.length) {
			const formatted = await esbuild.formatMessages(err.errors, {
				kind: "error",
				color: true,
				terminalWidth: process.stdout.columns || 80,
			});
			msg = formatted.join("\n");
		}
		return {
			success: false,
			error: msg,
		};
	}
}


export async function validate(__root, task) {
	if(!task.entry) throw `Missing entry property for task: ${util.inspect(task)}`;
	if(!fs.existsSync(path.join(__root, task.entry))) throw `Invalid entry property for task: ${util.inspect(task)}`;
}


