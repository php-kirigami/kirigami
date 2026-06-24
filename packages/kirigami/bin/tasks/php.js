import fs from 'fs';
import path from "path";
import util from "util";
import { joinWith, replaceRoot, log, c } from '../utils.js';
import { render, sitemap } from "@kirigami/php-prepros";

export const taskname = 'PHP';


export default async function build(__root, task, exportPath = null) {
	if(task.target) {
		return await render(task.target);
	} else {
		const renderResults = await render();
		if (!renderResults.success) return renderResults;
		const sitemapResults = await sitemap();
		if (!sitemapResults.success) return sitemapResults;
		return {
			success: true,
			files: [...renderResults.files, ...sitemapResults.files],
		};
	}
}


export async function validate(__root, task) { }


export function getWatcher(__root, task) {
	const root = __root.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//, '');
	const patterns = [joinWith(root, '**/_*.php'), joinWith(root, '**/*.yaml')]
	return {
		name: task.name,
		patterns: patterns,
		callback: async (events) => {
			console.log(`[${task.name}] batch`, events.length, events.map(e => e.file));
			const paths = events.map(e => {
				const dir = path.dirname(e.file.replace(root, '')).replace(/^\//, '');
				return task.deep ? path.dirname(dir) : dir;
			});
			await Promise.all(paths.filter((v, i, a) => a.indexOf(v) === i).map(async p => {
				const results = await build(__root, { target: p, ...task });
				if(results.success) {
					results.files.forEach(f => log.step(f));
				} else {
					log.error(c.red('Error: '));
					console.log(results.error);
				}
			}));
			console.log("");
		}
	};
}