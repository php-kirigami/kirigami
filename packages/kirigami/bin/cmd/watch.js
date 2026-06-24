import path from "path";
import chokidar from "chokidar";
import picomatch from "picomatch";
import { fileURLToPath, pathToFileURL } from 'url';
import { c, log, parseArgs, printCommandHelp } from "../utils.js";
import { getConfig } from "../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __root = process.cwd();
let __close = null;


const FORMATS = ["zip", "static", "docker", "gh-pages"];

const HELP = {
	name: "export",
	description: "Exporter le projet",
	usage: "[options]",
	options: [
		{ flag: `--format, -f <fmt>`, desc: `Format de sortie : ${FORMATS.join(", ")} (défaut: static)` },
		{ flag: "--outdir <path>", desc: "Dossier de sortie (défaut: ./export)" },
		{ flag: "--no-build", desc: "Ignorer l'étape de build (utilise ./dist existant)" },
		{ flag: "--help, -h", desc: "Afficher cette aide" },
	],
	examples: [
		"kiri export",
		"kiri export --format zip",
		"kiri export --format gh-pages --no-build",
	],
};




export default async function watch(args) {
	const { flags } = parseArgs(args);

	if (flags.help || flags.h) {
		printCommandHelp(HELP);
		return;
	}

	console.log(`\n${c.bold(c.cyan("Kirigami"))} — Watch Project\n`);
	const config = await getConfig();

	if(!config.export?.path) {
		log.error(` Missing export.path configuration in config file.`);
		process.exit(1);
	}

	log.step(`Project   : ${c.dim(config.kirigami.project)}`);
	log.step(`Base URL  : ${c.dim(config.kirigami.baseurl)}`);
	log.step(`Root      : ${c.dim(config.root)}`);
	console.log("\n");

	if(config.prepros) {
		const task = {
			name: "prepros",
			type: "php",
			config: config.prepros,
		};
		config.tasks = [ task, ...config.tasks];
	}

	
	
	const modules = [];
	const watchers = [];
	for (const task of config.tasks) {
		if(!modules[task.type]) {
			const taskPath = path.resolve(__dirname, "../tasks", `${task.type}.js`);
			modules[task.type] = await import(pathToFileURL(taskPath).href);
		}
		watchers.push(modules[task.type].getWatcher(config.root, task));
	}
	
	// console.log(watchers);
	const { close } = createWatchers(watchers);
	__close = close;
}


process.on("SIGINT", async () => {
	if(__close) {
		await __close();
	}
});













function toPosix(p) {
	return p.replace(/\\/g, "/");
}

function normalizePatterns(patterns) {
	return Array.isArray(patterns) ? patterns : [patterns];
}

/**
 * Extrait le répertoire de base d'un glob (partie avant le premier caractère spécial).
 */
function globBaseDir(glob) {
	const g = toPosix(glob);
	const idx = g.search(/[*?\[{]/);
	if (idx === -1) return g;
	const base = g.slice(0, idx);
	return base.replace(/\/+$/, "") || ".";
}

/**
 * Compile une liste d'ignorés (globs string, RegExp ou fonctions) en fonctions de test.
 * Retourne un seul prédicat (string) => boolean.
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
 * Chaque règle :
 *   - name        {string}   — label pour les logs
 *   - patterns    {string|string[]} — globs include (relatifs au cwd)
 *   - ignored     {string|RegExp|Function|(string|RegExp|Function)[]} — globs/regex/fonctions à exclure
 *   - debounceMs  {number}   — délai de debounce (défaut 150 ms)
 *   - callback    {Function} — async (events, ctx) => void
 *
 * Options globales :
 *   - cwd           {string}  — répertoire de travail (défaut process.cwd())
 *   - globalIgnored {string[]}— ignorés appliqués à toutes les règles
 *   - ignoreInitial {boolean} — ignore les events à l'initialisation (défaut true)
 *   - awaitWriteFinish         — options chokidar awaitWriteFinish
 *   - usePolling    {boolean}
 *   - interval      {number}
 *   - binaryInterval{number}
 *   - debug         {boolean}
 */
function createWatchers(rules, options = {}) {
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

	for (const rule of rules) {
		if (!rule || typeof rule.callback !== "function") {
			throw new Error("Each rule must have a callback(events, ctx).");
		}

		const name = rule.name || "rule";
		const patterns = normalizePatterns(rule.patterns);

		// include: un seul matcher picomatch pour tous les patterns de la règle
		const isIncluded = picomatch(patterns, { dot: true });

		// ignore: global + règle
		const isIgnored = buildIgnorePredicate([
			...(opt.globalIgnored || []),
			...(normalizePatterns(rule.ignored || [])),
		]);

		// baseDirs déduits des patterns
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

		const flush = async () => {
			if (running) { rerun = true; return; }
			running = true;
			try {
				do {
					rerun = false;
					const batch = Array.from(pending.values());
					pending.clear();
					if (batch.length) await rule.callback(batch, { rule });
				} while (rerun);
			} finally {
				running = false;
			}
		};

		const queue = (type, absPath) => {
			const rel = toPosix(path.relative(opt.cwd, absPath));

			if (isIgnored(rel)) return;
			if (!isIncluded(rel)) return;

			if (opt.debug) console.log(`[${name}] queue ${type} ${rel}`);

			pending.set(`${type}:${rel}`, { type, file: rel });
			clearTimeout(timer);
			timer = setTimeout(flush, rule.debounceMs ?? 150);
		};

		// ⚠️  On ne passe pas "ignored" à chokidar — le filtrage se fait dans queue()
		const watcher = chokidar.watch(baseDirs, {
			ignoreInitial: opt.ignoreInitial,
			awaitWriteFinish: opt.awaitWriteFinish,
			persistent: true,
			usePolling: opt.usePolling,
			interval: opt.interval,
			binaryInterval: opt.binaryInterval,
		});

		// watcher.on("add",    (p) => queue("add",    p));
		watcher.on("change", (p) => queue("change", p));
		// watcher.on("unlink", (p) => queue("unlink", p));
		watcher.on("error",  (err) => console.error(`[${name}] watch error:`, err));

		handles.push({
			watcher,
			stopTimers: () => { clearTimeout(timer); pending.clear(); },
		});
	}

	return {
		close: async () => {
			for (const h of handles) h.stopTimers();
			await Promise.all(handles.map((h) => h.watcher.close()));
		},
	};
}

export { createWatchers };