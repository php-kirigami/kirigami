import fs from 'fs';
import path from "path";
import findFiles from "../utils/findfile.js";
import isBinary from '../utils/isbinary.js';

const __root = process.cwd();

export default async function mount(php, msg) {
	const filesMounted = [];

	if(msg.patterns) {
		if(typeof msg.patterns != 'object') msg.patterns = [msg.patterns];
		for(const pattern of msg.patterns) {
			await Promise.all(findFiles(pattern).map(async file => {
				const localPath = path.join(__root, file);
				if(!fs.existsSync(localPath)) return;
				const dest = path.posix.join('/project', file);
				const buf = fs.readFileSync(localPath);
				const parentDir = dest.substring(0, dest.lastIndexOf('/'));
				if(parentDir) php.mkdirTree(parentDir);
				php.writeFile(dest, isBinary(buf) ? buf : buf.toString('utf8'));
				filesMounted.push(dest);
			}));
		}
	}

	return filesMounted;
}