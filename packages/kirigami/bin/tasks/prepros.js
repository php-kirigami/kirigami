import fs from "fs";
import path from "path";
import { joinWith, replaceRoot, log, c, printTaskError } from '../utils.js';
import { render, sitemap, resetRuntime, mountPath } from "@kirigami/php-prepros";
import { has as hasHook, run as runHook, runWaterfall, HOOKS } from '@kirigami/sdk';
import { getConfig } from '../config.js';
import { markdownHeader, pageDataFiles, passesDown } from '../libs/phpdoc.js';

export const taskname = 'PREPROS';
export const canwatch = true;
export const canbuild = false;

// PHP files plugins contribute via the `prepros:php` hook — collected once,
// passed to render() so php-prepros mounts + include_once's them before any
// page renders (a plugin can then PREPROS::registerTag() from PHP).
let _phpIncludes;
export function clearPhpIncludesCache() {
	_phpIncludes = undefined;
}
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
		const diagnostics = {};
		for (const key of ['warnings', 'stderr', 'debug']) {
			const messages = [renderResults[key], sitemapResults[key]].filter(Boolean);
			if (messages.length) diagnostics[key] = messages.join('\n');
		}
		return {
			...sitemapResults,
			...diagnostics,
			files: [...(renderResults.files || []), ...(sitemapResults.files || [])],
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

// Match the renderer's page-to-HTML convention. Never traverse directory links
// or remove a directory: cleanup is restricted to individual known page outputs.
function pageOutputs(root) {
	const pages = new Map();
	function visit(dir) {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith('.')) continue;
			const file = path.join(dir, entry.name);
			if (entry.isDirectory()) visit(file);
			else if (entry.isFile() && isPageName(entry.name, dir) && !path.basename(dir).startsWith('_')) {
				pages.set(file, path.join(dir, entry.name.replace(/^_+/, '').replace(/\.(php|md)$/i, '.html')));
			}
		}
	}
	if (fs.existsSync(root)) visit(root);
	return pages;
}

// Drops targets a directory target already renders (recursively).
export function withoutCovered(targets) {
	const dirs = targets.filter(t => !/\.(php|md)$/i.test(t));
	return targets.filter(t => !dirs.some(d => d !== t && (d === '.' || t.startsWith(`${d}/`))));
}

function sameKeys(a, b) {
	return a.size === b.size && [...a.keys()].every(key => b.has(key));
}

function removeObsoletePages(root, previous, current) {
	const retained = new Set(current.values());
	const removed = [];
	const realRoot = fs.realpathSync.native(root);
	for (const [source, output] of previous) {
		if (current.has(source) || retained.has(output) || !fs.existsSync(output)) continue;
		const relative = path.relative(realRoot, fs.realpathSync.native(output));
		if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) continue;
		if (!fs.lstatSync(output).isFile()) continue;
		fs.unlinkSync(output);
		removed.push(replaceRoot(output));
	}
	return removed;
}

// Same rule as PREPROS::isPage(): a `_*.php` file, or an `_index.md` that
// starts with an `@tag` header in a folder with no `_index.php` (otherwise
// the `.md` is data), with no `_`-prefixed directory on its path (relative
// to kirigami.root, POSIX separators). `dir` is the file's folder on disk.
function isPageName(name, dir) {
	if (/^_.*\.php$/i.test(name)) return true;
	if (!/^_index\.md$/i.test(name) || fs.existsSync(path.join(dir, '_index.php'))) return false;
	try {
		return Object.keys(markdownHeader(fs.readFileSync(path.join(dir, name), 'utf8'))).length > 0;
	} catch { return false; }
}

function isPage(rel, root = '.') {
	const parts = rel.split('/');
	const name = parts.pop();
	return !parts.some(part => part.startsWith('_')) && isPageName(name, path.join(root, ...parts));
}

// Data file → the pages whose header loads it (`@content _about.md`,
// `@team ../_data/team.yaml`), all relative to kirigami.root. A data file
// passed down (`@@menu _menu.yaml`) maps to the declaring page's directory
// instead, written with a trailing `/` (every page below loads it). Read
// fresh on each watch batch: a page edit can change what it loads.
export function dataDependents(root) {
	const dependents = new Map();
	const add = (dataRel, target) => {
		if (!dependents.has(dataRel)) dependents.set(dataRel, []);
		dependents.get(dataRel).push(target);
	};
	for (const file of pageOutputs(root).keys()) {
		const pageRel = path.relative(root, file).replace(/\\/g, '/');
		let source;
		try { source = fs.readFileSync(file, 'utf8'); } catch { continue; }
		const down = new Set(pageDataFiles(pageRel, source, { inherited: true }));
		for (const dataRel of down) add(dataRel, `${path.posix.dirname(pageRel)}/`);
		for (const dataRel of pageDataFiles(pageRel, source)) if (!down.has(dataRel)) add(dataRel, pageRel);
	}
	return dependents;
}

// The pages (relative to kirigami.root) that pass a value down (`@@tag`):
// editing one re-renders its whole directory.
export function passingPages(root) {
	const pages = new Set();
	for (const file of pageOutputs(root).keys()) {
		const pageRel = path.relative(root, file).replace(/\\/g, '/');
		try { if (passesDown(pageRel, fs.readFileSync(file, 'utf8'))) pages.add(pageRel); } catch { }
	}
	return pages;
}

// What a modified file re-renders: `null` for the whole site, else targets
// relative to kirigami.root (pages, or directories rendered recursively).
//   - a page (`_*.php`, or an `_index.md` page): just that page — its
//     directory when `prepros: { deep: true }`
//   - any other PHP (layouts, includes, partials, `_*/` helpers): every page
//     may use it, so the whole site
//   - a data file (.yaml/.yml/.md/.json): the pages that load it through
//     their header (`dependents`, see dataDependents()); one no header
//     references (read by PHP code) re-renders its directory
//   - a page that passes values down (`@@tag`, now or before the edit: in
//     `passing`): its whole directory
// `root` is kirigami.root on disk, to tell an `_index.md` page from data.
export function changeTarget(rel, { deep = false, dependents = null, root = '.', passing = null } = {}) {
	const dir = path.posix.dirname(rel);
	const isPhp = /\.php$/i.test(rel);
	if (isPhp || (/\.md$/i.test(rel) && isPage(rel, root))) {
		if (!isPage(rel, root)) return null;
		return deep || passing?.has(rel) ? dir : rel;
	}
	const pages = dependents?.get(rel);
	if (pages?.length) return pages.map((page) => page.endsWith('/') ? page.slice(0, -1) : deep ? path.posix.dirname(page) : page);
	return dir;
}

export function getWatcher(__root, task) {
	let pages = pageOutputs(__root);
	// Pages passing values down (`@@tag`), as of the last batch: a page that
	// just dropped its last `@@` still re-renders the pages below it once.
	let passing = passingPages(__root);
	const root = __root.replace(process.cwd(), '').replace(/\\/g, '/').replace(/^\//g, '');
	const deep = Boolean(task.config?.deep ?? task.deep);
	// Every PHP file, not just pages: layouts (`_layouts/header.php`) and
	// includes (`_lib/functions.php`) don't start with "_" themselves.
	const patterns = [joinWith(root, '**/*.php'), joinWith(root, '**/*.yaml'), joinWith(root, '**/*.yml'), joinWith(root, '**/*.md'), joinWith(root, '**/*.json')]
	// Source images (`image.source`, relative to the project): any page may
	// use one through IMG::asset() / <img asset> / {% img-asset %}, or list a
	// folder of them (a gallery), so adding, replacing or removing one renders
	// every page again. Outputs go to `image.dest`, under the root: no loop.
	const imageRoot = String(task.image?.source ?? 'assets/images').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
	if (imageRoot) patterns.push(`${imageRoot}/**/*`);
	const isImage = (file) => imageRoot && file.replace(/\\/g, '/').startsWith(`${imageRoot}/`);
	// A watched file's path relative to kirigami.root.
	const relative = (file) => path.posix.relative(root || '.', file.replace(/\\/g, '/'));
	return {
		name: task.name,
		patterns: patterns,
		callback: async (events) => {
			if (!events.length) return;
			console.log(`[${task.name}] batch`, events.length, events.map(e => e.file));
			if (events.some(e => isImage(e.file))) {
				const results = await build(__root, { ...task, target: null });
				if (results.success) results.files.forEach(f => log.step(f));
				else printTaskError(results);
				return results;
			}
			// An `_index.md` gaining or losing its header turns into a page or
			// back into data: handled like an added or deleted page.
			const flipped = events.some(e => /(^|[\\/])_index\.md$/i.test(e.file)) &&
				!sameKeys(pages, pageOutputs(__root));
			if (flipped || events.some(e => e.type !== 'change')) {
				const current = pageOutputs(__root);
				const removed = removeObsoletePages(__root, pages, current);
				// A fresh mount drops deleted files and refreshes page/data discovery.
				await resetRuntime();
				const results = await build(__root, { ...task, target: null });
				if (results.success) pages = current;
				else printTaskError(results);
				passing = passingPages(__root);
				return { ...results, files: [...(results.files || []), ...removed] };
			}
			const dataEvents = events.filter(e => !/\.php$/i.test(e.file));
			// render() remounts the page it renders, not the data it loads:
			// refresh the PHP VFS copy of each changed data file first.
			for (const e of dataEvents) await mountPath(e.file);
			const dependents = dataEvents.length ? dataDependents(__root) : null;
			const now = passingPages(__root);
			const before = passing;
			passing = now;
			const passed = new Set([...before, ...now]);
			const targets = [...new Set(events.flatMap(e => [changeTarget(relative(e.file), { deep, dependents, root: __root, passing: passed })].flat()))];
			// One global change re-renders everything (plus the sitemap) once.
			const renders = targets.includes(null) ? [null] : withoutCovered(targets);
			const allResults = await Promise.all(renders.map(async target => {
				const results = await build(__root, { ...task, target });
				if(results.success) {
					results.files.forEach(f => log.step(f));
					if(results.warnings) log.warn(c.dim(results.warnings));
				} else {
					printTaskError(results);
				}
				return results;
			}));
			console.log("");
			const success = allResults.every(r => r.success);
			return {
				success,
				files: allResults.flatMap(r => r.files || []),
				warnings: allResults.map(r => r.warnings).filter(Boolean).join("\n") || undefined,
				error: success ? undefined : allResults.find(r => !r.success)?.error,
			};
		}
	};
}
