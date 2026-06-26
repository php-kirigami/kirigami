import os from "os";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(os.homedir(), ".config", "kirigami", "store.json");

function readStore() {
	try {
		return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
	} catch {
		return {};
	}
}

function writeStore(data) {
	fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

export function storeGet(key) {
	return readStore()[key];
}

export function storeSet(key, value) {
	const data = readStore();
	data[key] = value;
	writeStore(data);
}