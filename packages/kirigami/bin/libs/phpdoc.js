// ---------------------------------------------------------------------------
// PHPDOC page headers, read from Node the way php-prepros reads them in PHP,
// so the watcher knows which data files a page loads without running PHP.
//   - FS::phpFileInfo(): the file's first doc comment (after the PHP open tag)
//   - FS::parseDocBlock(): `@tag value` lines; a value continues on indented
//     lines, up to the next tag, a blank line, or flush-left prose
//   - the `page_info` hook: a value ending in .yaml/.yml/.json/.md that isn't
//     a URL is a data file, resolved against the page's directory
// Keep in step with php-prepros (src/libraries/fs.class.php, prepros.plugins.php).
// ---------------------------------------------------------------------------
import path from 'node:path';

const DATA_EXTS = new Set(['.yaml', '.yml', '.json', '.md']);
const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

export function firstDocBlock(source) {
	const start = source.indexOf('<?php');
	if (start === -1) return null;
	return /\/\*\*[\s\S]*?\*\//.exec(source.slice(start))?.[0] ?? null;
}

export function parseDocBlock(block) {
	const info = {};
	let current = null;
	for (let line of block.split(/\r\n|\r|\n/)) {
		line = line.replace(/^\s*\/\*\*+/, '').replace(/\s*\*\/\s*$/, '').replace(/^[ \t]*\*[ \t]?/, '');
		const tag = /^@([A-Za-z0-9_]+)[ \t]*(.*)$/.exec(line);
		if (tag) {
			current = tag[1];
			info[current] = tag[2].trim();
		} else if (line.trim() === '') {
			current = null;
		} else if (current !== null && /^[ \t]/.test(line)) {
			info[current] = `${info[current]} ${line.trim()}`.trim();
		} else {
			current = null;
		}
	}
	return info;
}

// Data files a page loads through its annotations, as POSIX paths relative to
// the same base as `pageRel`.
export function pageDataFiles(pageRel, source) {
	const block = firstDocBlock(source);
	if (!block) return [];
	const dir = path.posix.dirname(pageRel);
	return Object.values(parseDocBlock(block))
		.filter((value) => DATA_EXTS.has(path.posix.extname(value).toLowerCase()) && !URL_RE.test(value))
		.map((value) => path.posix.normalize(path.posix.join(dir, value)));
}
