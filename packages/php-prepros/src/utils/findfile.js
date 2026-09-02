import fs from 'fs';
import path from "path";
import picomatch from "picomatch";

export default function findFiles(pattern, cwd = process.cwd()) {
	const isMatch = picomatch(pattern);
	const results = [];
	function walk(dir) {
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			const relativePath = path.relative(cwd, fullPath);
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name === '.git') continue;
				walk(fullPath);
			} else if (entry.isFile()) {
				if (isMatch(relativePath.split(path.sep).join('/'))) {
					results.push(relativePath.replaceAll('\\', '/'));
				}
			}
		}
	}
	walk(cwd);
	return results;
}