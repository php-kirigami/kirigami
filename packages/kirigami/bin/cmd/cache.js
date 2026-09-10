import fs from "fs";
import path from "path";
import { Cache } from "@kirigami/sdk";
import { c, log, parseArgs, printCommandHelp } from "../utils.js";


const __root = process.cwd();

// The two SQLite caches Kirigami leaves at the project root, plus the cURL
// cookie jar. `.node.db` is kirigami-core's cache (@kirigami/sdk, node:sqlite);
// `.cache.db` is the PHP-side CACHE class (php-prepros); `.cookie.txt` is the
// CURL/SCRAPER cookie jar. Both dbs share the same "data" table layout, so a
// key mask can be applied to either through the same Cache class.
const DB_FILES = [".node.db", ".cache.db"];
const EXTRA_FILES = [".cookie.txt"];


const HELP = {
	name: "cache",
	description: "Purge Kirigami's local caches (the .node.db / .cache.db SQLite stores and the .cookie.txt jar).",
	usage: "purge [key-mask] [options]",
	options: [
		{ flag: "--help, -h", desc: "Show this help section" },
	],
	notes: [
		"kiri cache purge            — delete the .node.db, .cache.db and .cookie.txt files (whichever exist).",
		"kiri cache purge <mask>     — keep the files but delete every cache key matching <mask> in both dbs.",
		"A key mask is a glob against the key namespace, e.g. \"meta_*\", \"colors_*\", \"font_*\".",
		"Runs against the current working directory (the project root).",
	],
	examples: [
		"kiri cache purge",
		"kiri cache purge meta_*",
		"kiri cache purge \"colors_*\"",
	],
};


export default async function cache(args) {
	const { command, subcommand, flags } = parseArgs(args);

	if (flags.help || flags.h || !command) {
		printCommandHelp(HELP);
		return;
	}

	if (command !== "purge") {
		throw `Unknown subcommand "${command}". Try ${c.cyan("kiri cache --help")}.`;
	}

	console.log(`\n${c.bold(c.cyan("kiri"))} — Cache purge\n`);

	const mask = subcommand || null;

	if (mask) {
		purgeKeys(mask);
	} else {
		purgeFiles();
	}

	console.log();
}


// ─── kiri cache purge <mask> ───────────────────────────────────────────────
// Delete every key matching the glob mask from each existing cache db.
function purgeKeys(mask) {
	log.step(`Key mask : ${c.dim(mask)}`);

	let touched = 0;
	for (const name of DB_FILES) {
		const file = path.join(__root, name);
		if (!fs.existsSync(file)) {
			log.step(`${c.dim(name)} — not found, skipped.`);
			continue;
		}
		const db = new Cache(file);
		let removed = 0;
		try {
			removed = db.purge(mask);
		} finally {
			db.close();
		}
		touched += removed;
		log.step(`${c.dim(name)} — ${removed} key(s) removed.`);
	}

	log.success(c.bold(c.green(` ${touched} cache key(s) removed.`)));
}


// ─── kiri cache purge ──────────────────────────────────────────────────────
// Delete the cache db files and the cookie jar entirely.
function purgeFiles() {
	let removed = 0;
	for (const name of [...DB_FILES, ...EXTRA_FILES]) {
		const file = path.join(__root, name);
		if (!fs.existsSync(file)) {
			log.step(`${c.dim(name)} — not found, skipped.`);
			continue;
		}
		fs.rmSync(file);
		removed++;
		log.step(`${c.dim(name)} — deleted.`);
	}

	if (removed) log.success(c.bold(c.green(` ${removed} file(s) deleted.`)));
	else log.warn("Nothing to purge.");
}
