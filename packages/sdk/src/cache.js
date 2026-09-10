import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';


const DB_TIMEOUT = 10000;
const DEFAULT_DB_FILENAME = '.node.db';

// Every cache key must start with a namespace: one or more [a-z] characters
// followed by a `_` (e.g. `colors_`, `font_`, `meta_`). This keeps keys
// readable and, above all, makes targeted purging by mask possible (see
// Cache.purge()).
const KEY_PATTERN = /^[a-z]+_/;

function assertKey(key) {
	if (typeof key !== 'string' || !KEY_PATTERN.test(key)) {
		throw new TypeError(
			`Cache: invalid key ${JSON.stringify(key)} — must start with a namespace ${KEY_PATTERN} (e.g. "colors_...").`
		);
	}
}

// Converts a glob mask ("meta_*") into a SQL LIKE pattern. The LIKE
// metacharacters present in the mask (`%`, `_`, `\`) are escaped — important
// for the `_` in namespaces — then `*` becomes `%`. Use with ESCAPE '\'.
function globToLike(mask) {
	return String(mask).replace(/[\\%_]/g, '\\$&').replace(/\*/g, '%');
}


// ---------------------------------------------------------------------------
// Persistent key/value cache, on SQLite (node:sqlite — built into Node, no
// native compilation required, unlike better-sqlite3). Each value is
// serialized to JSON and can have a TTL (in seconds, 0 = never expires).
//
// One instance = one .db file. kirigami-core keeps one by default (as
// bin/tasks/sass.js does), but a plugin is free to create its own with
// `new Cache('/path/to/its/file.db')` if it wants its own isolated cache
// rather than sharing the core's.
// ---------------------------------------------------------------------------
export class Cache {
	#db = null;
	#dbFile;

	constructor(dbFile = path.join(process.cwd(), DEFAULT_DB_FILENAME)) {
		this.#dbFile = dbFile;
	}

	#getDb() {
		if (this.#db) return this.#db;

		const exists = fs.existsSync(this.#dbFile);
		this.#db = new DatabaseSync(this.#dbFile);
		// No equivalent to db.pragma() on DatabaseSync for now: we go through
		// exec() with raw PRAGMA SQL.
		this.#db.exec(`PRAGMA busy_timeout = ${DB_TIMEOUT};`);

		if (!exists) {
			this.#db.exec(`
				CREATE TABLE "data" (
					"key"         TEXT(128) NOT NULL,
					"val"         TEXT      DEFAULT NULL,
					"inserted_at" INTEGER   NOT NULL DEFAULT 0,
					"ttl"         INTEGER   NOT NULL DEFAULT 0,
					PRIMARY KEY ("key")
				);
			`);
		}

		return this.#db;
	}

	get(key) {
		assertKey(key);
		const now = Math.floor(Date.now() / 1000);
		const row = this.#getDb().prepare(
			`SELECT val FROM data
			 WHERE key = ?
			   AND (ttl = 0 OR inserted_at + ttl >= ?)`
		).get(key, now);

		if (!row) return null;
		try {
			return JSON.parse(row.val);
		} catch {
			return null;
		}
	}

	set(key, val, ttl = 0) {
		assertKey(key);
		const now = Math.floor(Date.now() / 1000);
		const info = this.#getDb().prepare(
			`INSERT OR REPLACE INTO data(key, val, inserted_at, ttl)
			 VALUES(?, ?, ?, ?)`
		).run(key, JSON.stringify(val), now, ttl);
		return info.changes > 0;
	}

	// With no argument: deletes expired entries (past their TTL).
	// With a glob mask ("meta_*", "colors_*", …): deletes every entry whose
	// key matches, expired or not — targeted invalidation of a namespace.
	// Returns the number of deleted rows.
	purge(mask = null) {
		const now = Math.floor(Date.now() / 1000);

		if (mask === null || mask === undefined) {
			const info = this.#getDb().prepare(
				`DELETE FROM data WHERE ttl > 0 AND inserted_at + ttl < ?`
			).run(now);
			return Number(info.changes);
		}

		const info = this.#getDb().prepare(
			`DELETE FROM data WHERE key LIKE ? ESCAPE '\\'`
		).run(globToLike(mask));
		return Number(info.changes);
	}

	// "delete" is a reserved JS word, impossible to use as a declared method
	// name without a computed key — hence "del".
	del(key) {
		assertKey(key);
		const info = this.#getDb().prepare(`DELETE FROM data WHERE key = ?`).run(key);
		return info.changes > 0;
	}

	close() {
		this.#db?.close();
		this.#db = null;
	}
}
