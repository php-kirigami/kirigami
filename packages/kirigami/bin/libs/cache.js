import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';


const DB_TIMEOUT = 10000;
const DB_FILENAME = '.node.db';

let db = null;


function getPath() {
	return path.join(process.cwd(), DB_FILENAME);
}


function getDb() {
	if(db) return db;

	const dbFile = getPath();
	const exists = fs.existsSync(dbFile);

	db = new Database(dbFile);
	db.pragma(`busy_timeout = ${DB_TIMEOUT}`);

	if(!exists) {
		db.exec(`
			CREATE TABLE "data" (
				"key"         TEXT(128) NOT NULL,
				"val"         TEXT      DEFAULT NULL,
				"inserted_at" INTEGER   NOT NULL DEFAULT 0,
				"ttl"         INTEGER   NOT NULL DEFAULT 0,
				PRIMARY KEY ("key")
			);
		`);
	}

	return db;
}


export function get(key) {
	const now = Math.floor(Date.now() / 1000);
	const row = getDb().prepare(
		`SELECT val FROM data
		 WHERE key = ?
		   AND (ttl = 0 OR inserted_at + ttl >= ?)`
	).get(key, now);

	if(!row) return null;
	try {
		return JSON.parse(row.val);
	} catch {
		return null;
	}
}


export function set(key, val, ttl = 0) {
	const now = Math.floor(Date.now() / 1000);
	const info = getDb().prepare(
		`INSERT OR REPLACE INTO data(key, val, inserted_at, ttl)
		 VALUES(?, ?, ?, ?)`
	).run(key, JSON.stringify(val), now, ttl);
	return info.changes > 0;
}


export function purge() {
	const now = Math.floor(Date.now() / 1000);
	const info = getDb().prepare(
		`DELETE FROM data WHERE ttl > 0 AND inserted_at + ttl < ?`
	).run(now);
	return info.changes >= 0;
}


// "delete" est un mot réservé JS, impossible à utiliser comme nom de
// fonction déclarée — d'où "del".
export function del(key) {
	const info = getDb().prepare(`DELETE FROM data WHERE key = ?`).run(key);
	return info.changes > 0;
}