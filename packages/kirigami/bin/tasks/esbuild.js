import fs from 'fs'; 	
import path from "path";
import util from "util";
import esbuild from "esbuild";
import { replaceRoot, joinWith, c, log } from '../utils.js';
import { getConfig } from '../config.js';
import { run as runHook, HOOKS } from '@kirigami/sdk';

// esbuild resolves import specifiers with POSIX separators even on Windows.
const toImport = (p) => JSON.stringify(p.split(path.sep).join('/'));


export const taskname = 'ESBUILD';
export const canwatch = true;
export const canbuild = true;


export default async function build(__root, task, exportPath = null) {
	const config = await getConfig();
	const { before = [], after = [], plugins = [], ...params } = config.esbuild || {};
	const entry = path.join(__root, task.entry);
	const outfile = path.join(exportPath || __root, task.entry).replace(/\.(?:tsx?|jsx?)$/i, '.min.js');
	const dir = path.dirname(outfile);

	if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

	// config.esbuild.before / .after: extra files bundled before / after the
	// entry (paths relative to cwd()). The 'esbuild:before' / 'esbuild:after'
	// hooks let plugins contribute more — each listener returns a path
	// (preferably absolute, resolved from its own package) or an array of
	// paths; they're bundled as bare side-effect imports, so order is
	// preserved: before → entry → after. The 'esbuild:plugins' hook adds
	// esbuild plugins, same shape as the API's `plugins` option.
	const hookContext = { __root, task, exportPath, config };
	const [hookBefore, hookAfter, hookPlugins] = await Promise.all([
		runHook(HOOKS.ESBUILD_BEFORE, hookContext),
		runHook(HOOKS.ESBUILD_AFTER, hookContext),
		runHook(HOOKS.ESBUILD_PLUGINS, hookContext),
	]);
	const beforeFiles = [...[].concat(before), ...hookBefore].filter(Boolean).map((p) => path.resolve(process.cwd(), p));
	const afterFiles = [...[].concat(after), ...hookAfter].filter(Boolean).map((p) => path.resolve(process.cwd(), p));
	const allPlugins = [...[].concat(plugins), ...hookPlugins].filter(Boolean);

	// With before/after files, the real entry is wrapped in a synthetic entry
	// (esbuild `stdin`) that side-effect-imports everything in order.
	const entryOptions = (beforeFiles.length || afterFiles.length)
		? {
			stdin: {
				contents: [
					...beforeFiles.map((f) => `import ${toImport(f)};`),
					`import ${toImport(entry)};`,
					...afterFiles.map((f) => `import ${toImport(f)};`),
				].join('\n'),
				resolveDir: process.cwd(),
				sourcefile: 'kirigami-entry.js',
				loader: 'js',
			},
		}
		: { entryPoints: [entry] };

	try {
		await esbuild.build({
			...entryOptions,
			outfile,
			bundle: true,
			platform: "browser",
			logLevel: "silent",
			treeShaking: true,
			minify: true,
			supported: { "template-literal": false },
			target: ["es2020"],
			legalComments: "none",
			loader: { '.json': 'json' },
			sourcemap: !exportPath,
			...params,
			plugins: allPlugins.length ? allPlugins : undefined,
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


export function getWatcher(__root, task) {
	const root = __root.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
	const dir = joinWith(root, path.dirname(task.entry));
	const patterns = [joinWith(dir, '**/*.js'), joinWith(dir, '**/*.jsx'), joinWith(dir, '**/*.ts'), joinWith(dir, '**/*.tsx')]
	return {
		name: task.name,
		patterns: patterns,
		ignored: [joinWith(dir, '**/*.min.js')],
		callback: async (events) => {
			if(!events.filter(e => e.type != 'add').length) return;
			console.log(`[${task.name}] batch`, events.length, events.map(e => e.file));
			const results = await build(__root, task);
			if(results.success) {
				results.files.forEach(f => log.step(f));
			} else {
				console.log(results.error);
			}
			console.log("");
		}
	};
}