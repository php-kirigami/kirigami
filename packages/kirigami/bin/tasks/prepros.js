import fs from "fs";
import path from "path";
import { joinWith, replaceRoot, log, c, printTaskError } from '../utils.js';
import { render, sitemap } from "@kirigami/php-prepros";
import { has as hasHook, run as runHook, runWaterfall, HOOKS } from '@kirigami/sdk';
import { getConfig } from '../config.js';

export const taskname = 'PREPROS';
export const canwatch = true;
export const canbuild = false;

// PHP files plugins contribute via the `prepros:php` hook — collected once,
// passed to render() so php-prepros mounts + include_once's them before any
// page renders (a plugin can then PREPROS::registerTag() from PHP).
let _phpIncludes;
async function phpIncludes(__root) {
	if (_phpIncludes) return _phpIncludes;
	const config = await getConfig();
	_phpIncludes = (await runHook(HOOKS.PREPROS_PHP, { __root, config }))
		.filter(Boolean)
		.map(p => path.resolve(process.cwd(), p));
	return _phpIncludes;
}


export default async function build(__root, task, exportPath = null) {
	const php = await phpIncludes(__root);
	if(task.target) {
		const results = await render(task.target, php);
		if(results.success) await applyHtmlHooks(results.files, exportPath);
		return results;
	} else {
		const renderResults = await render('.', php);
		if (!renderResults.success) return renderResults;
		await applyHtmlHooks(renderResults.files, exportPath);
		const sitemapResults = await sitemap();
		if (!sitemapResults.success) return sitemapResults;
		return {
			success: true,
			files: [...renderResults.files, ...sitemapResults.files],
		};
	}
}


// Pipes every rendered .html file through the `prepros:html` waterfall hook so
// plugins (@kirigami/plugin-highlight, …) can post-process the final markup.
// No listener registered → nothing is read or rewritten.
async function applyHtmlHooks(files, exportPath) {
	if (!hasHook(HOOKS.PREPROS_HTML)) return;

	const config = await getConfig();
	const htmlFiles = (files || []).filter(f => /\.html?$/i.test(f));

	for (const rel of htmlFiles) {
		const abs = path.resolve(process.cwd(), rel);
		let html;
		try {
			html = fs.readFileSync(abs, 'utf8');
		} catch {
			continue;
		}
		const out = await runWaterfall(HOOKS.PREPROS_HTML, html, { file: rel, abs, exportPath, config });
		if (typeof out === 'string' && out !== html) fs.writeFileSync(abs, out, 'utf8');
	}
}


export async function validate(__root, task) { }


export function getWatcher(__root, task) {
	const root = __root.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//g, '');
	const patterns = [joinWith(root, '**/_*.php'), joinWith(root, '**/*.yaml'), joinWith(root, '**/*.yml'), joinWith(root, '**/*.md'), joinWith(root, '**/*.json')]
	return {
		name: task.name,
		patterns: patterns,
		callback: async (events) => {
			if(!events.filter(e => e.type != 'add').length) return;
			console.log(`[${task.name}] batch`, events.length, events.map(e => e.file));
			const paths = events.map(e => {
				const dir = path.dirname(e.file.replace(root, '')).replace(/^\//, '');
				return task.deep ? path.dirname(dir) : dir;
			});
			await Promise.all(paths.filter((v, i, a) => a.indexOf(v) === i).map(async p => {
				const results = await build(__root, { target: p, ...task });
				if(results.success) {
					results.files.forEach(f => log.step(f));
					if(results.warnings) log.warn(c.dim(results.warnings));
				} else {
					printTaskError(results);
				}
			}));
			console.log("");
		}
	};
}
