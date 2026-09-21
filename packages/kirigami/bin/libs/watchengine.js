import path from "path";
import chokidar from "chokidar";
import picomatch from "picomatch";
import { fileURLToPath, pathToFileURL } from "url";

/**
 * bin/libs/watchengine.js — the file-watching core shared by `kiri watch`
 * and `kiri serve` (which is `watch` plus a static server + hot-reload).
 * Extracted so neither command re-implements the other's plumbing.
 */

// Resolved from this file's own location, not a caller-supplied dirname —
// used to require every caller (bin/cmd/*.js, and @kirigami/cli's commands
// across the package boundary since the core-api split) to pass one in just
// so this could find its sibling tasks/ folder.
const tasksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tasks");

// Builds one watch "rule" per watchable task (esbuild, sass, prepros, …),
// prepending the implicit `prepros` task the same way `build`/`export` do.
// Use a local list so repeated watch/serve setup leaves configured tasks intact.
export async function buildWatchRules(config) {
	const tasks = [...config.tasks];
	if (config.prepros) {
		const task = {
			name: "prepros",
			type: "prepros",
			config: config.prepros,
		};
		tasks.unshift(task);
	}

	const modules = {};
	const watchers = [];
	for (const task of tasks) {
		if (!modules[task.type]) {
			const taskPath = path.join(tasksDir, `${task.type}.js`);
			modules[task.type] = await import(pathToFileURL(taskPath).href);
		}
		if (modules[task.type].canwatch) {
			// `type` isn't part of what a task's own getWatcher() returns — attached
			// here so callers (kiri serve's hot-reload) can tell a sass rule apart
			// from esbuild/prepros without each task module repeating the field.
			watchers.push({ ...modules[task.type].getWatcher(config.root, task), type: task.type });
		}
	}
	return watchers;
}


function toPosix(p) {
	return p.replace(/\\/g, "/");
}


function normalizePatterns(patterns) {
	return Array.isArray(patterns) ? patterns : [patterns];
}

/**
 * Extracts the base directory of a glob (the part before the first special character).
 */
function globBaseDir(glob) {
	const g = toPosix(glob);
	const idx = g.search(/[*?\[{]/);
	if (idx === -1) return g;
	const base = g.slice(0, idx);
	return base.replace(/\/+$/, "") || ".";
}

/**
 * Compiles a list of ignore entries (string globs, RegExp or functions) into test functions.
 * Returns a single predicate (string) => boolean.
 */
function buildIgnorePredicate(ignoreList) {
	if (!ignoreList || ignoreList.length === 0) return () => false;

	const matchers = ignoreList.map((ig) => {
		if (ig instanceof RegExp) return (p) => ig.test(p);
		if (typeof ig === "function") return ig;
		// string glob -> picomatch
		return picomatch(ig, { dot: true });
	});

	return (relPosix) => matchers.some((m) => m(relPosix));
}

/**
 * createWatchers(rules, options)
 *
 * Each rule:
 *   - name        {string}   — label for the logs
 *   - patterns    {string|string[]} — include globs (relative to cwd)
 *   - ignored     {string|RegExp|Function|(string|RegExp|Function)[]} — globs/regex/functions to exclude
 *   - debounceMs  {number}   — debounce delay (default 150 ms)
 *   - callback    {Function} — async (events, ctx) => void
 *
 * Global options:
 *   - cwd           {string}  — working directory (default process.cwd())
 *   - globalIgnored {string[]}— ignore entries applied to every rule
 *   - ignoreInitial {boolean} — ignore events on startup (default true)
 *   - awaitWriteFinish         — chokidar awaitWriteFinish options
 *   - usePolling    {boolean}
 *   - interval      {number}
 *   - binaryInterval{number}
 *   - debug         {boolean}
 */
export function createWatchers(rules, options = {}) {
	const opt = {
		cwd: process.cwd(),
		globalIgnored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
		ignoreInitial: true,
		awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 10 },
		usePolling: false,
		interval: 200,
		binaryInterval: 300,
		debug: false,
		...options,
	};

	const handles = [];
	let startupError;
	let closed = false;
	let closing;
	const close = () => closing ??= (async () => {
		closed = true;
		for (const h of handles) h.stopTimers();
		const outcomes = await Promise.allSettled(handles.map(async h => {
			try { await h.watcher.close(); }
			finally { await h.idle(); }
		}));
		const failure = outcomes.find(result => result.status === 'rejected');
		if (failure) throw failure.reason;
	})();

	try {
		for (const rule of rules) {
			if (!rule || typeof rule.callback !== "function") {
				throw new Error("Each rule must have a callback(events, ctx).");
			}

			const name = rule.name || "rule";
			const patterns = normalizePatterns(rule.patterns);

			// include: a single picomatch matcher for all of the rule's patterns
			const isIncluded = picomatch(patterns, { dot: true });

			// ignore: global + rule
			const isIgnored = buildIgnorePredicate([
				...(opt.globalIgnored || []),
				...(normalizePatterns(rule.ignored || [])),
			]);

			// baseDirs derived from the patterns
			const baseDirs = Array.from(
				new Set(patterns.map(globBaseDir).map((d) => d || "."))
			).map((d) => path.resolve(opt.cwd, d));

			if (opt.debug) {
				console.log(`\n[${name}] starting watcher`);
				console.log("  cwd      :", opt.cwd);
				console.log("  patterns :", patterns);
				console.log("  baseDirs :", baseDirs);
				console.log("  ignored  :", [...(opt.globalIgnored || []), ...(rule.ignored || [])]);
				console.log("");
			}

			// --- debounce / batch ---
			const pending = new Map();
			let timer = null;
			let running = false;
			let rerun = false;
			let active = Promise.resolve();

			const flush = async () => {
				if (running) { rerun = true; return; }
				running = true;
				try {
					do {
						rerun = false;
						const batch = Array.from(pending.values());
						pending.clear();
						if (batch.length && !closed) {
							try { await rule.callback(batch, { rule }); }
							catch (error) { console.error(`[${name}] build failed:`, error); }
						}
					} while (rerun && !closed);
				} finally {
					running = false;
				}
			};

			const queue = (type, absPath) => {
				if (closed) return;
				const rel = toPosix(path.relative(opt.cwd, absPath));

				if (isIgnored(rel)) return;
				if (type !== 'unlinkDir' && !isIncluded(rel)) return;

				if (opt.debug) console.log(`[${name}] queue ${type} ${rel}`);

				pending.set(`${type}:${rel}`, { type, file: rel });
				clearTimeout(timer);
				timer = setTimeout(() => {
					if (running) { rerun = true; return; }
					active = flush().catch(error => console.error(`[${name}] watch error:`, error));
				}, rule.debounceMs ?? 150);
			};

			// ⚠️  We don't pass "ignored" to chokidar — filtering happens in queue()
			const watcher = chokidar.watch(baseDirs, {
				ignoreInitial: opt.ignoreInitial,
				awaitWriteFinish: opt.awaitWriteFinish,
				persistent: true,
				usePolling: opt.usePolling,
				interval: opt.interval,
				binaryInterval: opt.binaryInterval,
			});

			watcher.on("add",    (p) => queue("add",    p));
			watcher.on("change", (p) => queue("change", p));
			watcher.on("unlink", (p) => queue("unlink", p));
			watcher.on("unlinkDir", (p) => queue("unlinkDir", p));
			let settleReady;
			const ready = new Promise((resolve, reject) => {
				settleReady = resolve;
				watcher.once('ready', resolve);
				watcher.on('error', error => {
					reject(error);
					console.error(`[${name}] watch error:`, error);
				});
			});

			handles.push({
				watcher,
				ready,
				idle: () => active,
				stopTimers: () => { clearTimeout(timer); pending.clear(); settleReady(); },
			});
		}
	} catch (error) {
		startupError = error;
	}

	const ready = Promise.all([
		...handles.map(h => h.ready),
		startupError ? Promise.reject(startupError) : Promise.resolve(),
	]).catch(async error => {
		await close();
		throw error;
	});
	// Direct callers may only use close(); startup errors still remain awaitable.
	void ready.catch(() => {});
	return {
		ready,
		close,
	};
}
