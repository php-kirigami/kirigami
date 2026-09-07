import path from "path";
import getFileStats from "../utils/getfilestats.js";

const __root = process.cwd();

export default async function fstat(php, msg) {
	const file = path.join(__root, msg.path);
	return getFileStats(file);
}