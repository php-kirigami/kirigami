// ---------------------------------------------------------------------------
// PHPDOC page headers, read from Node the way php-prepros reads them in PHP,
// so the watcher knows which data files a page loads without running PHP.
//   - FS::phpFileInfo(): the file's first doc comment (after the PHP open tag),
//     or for a Markdown page the `@tag` lines at its top (FS::splitHeader())
//   - FS::parseDocBlock(): `@tag value` lines; a value continues on indented
//     lines, up to the next tag, a blank line, or flush-left prose. An
//     `@@tag` is a tag passed down to child pages too.
//   - the `page_info` hook: a value ending in .yaml/.yml/.json/.md that isn't
//     a URL is a data file, resolved against the page's directory
// Keep in step with php-prepros (src/libraries/fs.class.php, prepros.plugins.php).
// ---------------------------------------------------------------------------
import path from 'node:path';

const DATA_EXTS = new Set(['.yaml', '.yml', '.json', '.md']);
const URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const TAG_RE = /^@(@?)([A-Za-z0-9_]+)[ \t]*(.*)$/;

export function firstDocBlock(source) {
	const start = source.indexOf('<?php');
	if (start === -1) return null;
	return /\/\*\*[\s\S]*?\*\//.exec(source.slice(start))?.[0] ?? null;
}

// Records one tag; `inherited` (a Set, optional) tracks the `@@` names, a
// later plain `@tag` of the same name taking it back out.
function setTag(info, inherited, tag) {
	info[tag[2]] = tag[3].trim();
	if (tag[1]) inherited?.add(tag[2]);
	else inherited?.delete(tag[2]);
	return tag[2];
}

export function parseDocBlock(block, inherited = null) {
	const info = {};
	let current = null;
	for (let line of block.split(/\r\n|\r|\n/)) {
		line = line.replace(/^\s*\/\*\*+/, '').replace(/\s*\*\/\s*$/, '').replace(/^[ \t]*\*[ \t]?/, '');
		const tag = TAG_RE.exec(line);
		if (tag) {
			current = setTag(info, inherited, tag);
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

// A Markdown page's header, as FS::splitHeader() reads it: the `@tag value`
// lines at the top of the file (same continuation rules), up to the first
// blank or flush-left non-tag line.
export function markdownHeader(source, inherited = null) {
	const lines = source.replace(/^﻿/, '').split(/\r\n|\r|\n/);
	const info = {};
	let current = null;
	let i = 0;
	while (i < lines.length && lines[i].trim() === '') i++;
	for (; i < lines.length; i++) {
		const line = lines[i];
		const tag = TAG_RE.exec(line);
		if (tag) {
			current = setTag(info, inherited, tag);
		} else if (line.startsWith('@')) {
			current = null;
		} else if (current !== null && line.trim() !== '' && /^[ \t]/.test(line)) {
			info[current] = `${info[current]} ${line.trim()}`.trim();
		} else {
			break;
		}
	}
	return info;
}

// A page's own annotations, from a `.md` header or a PHP doc block.
export function pageInfo(pageRel, source, inherited = null) {
	if (/\.md$/i.test(pageRel)) return markdownHeader(source, inherited);
	const block = firstDocBlock(source);
	return block ? parseDocBlock(block, inherited) : {};
}

// Data files a page loads through its annotations, as POSIX paths relative to
// the same base as `pageRel`. `inherited: true` keeps only the `@@` ones,
// which every page below loads too.
export function pageDataFiles(pageRel, source, { inherited = false } = {}) {
	const dir = path.posix.dirname(pageRel);
	const names = new Set();
	const info = pageInfo(pageRel, source, names);
	return Object.entries(info)
		.filter(([name]) => !inherited || names.has(name))
		.map(([, value]) => value)
		.filter((value) => DATA_EXTS.has(path.posix.extname(value).toLowerCase()) && !URL_RE.test(value))
		.map((value) => path.posix.normalize(path.posix.join(dir, value)));
}

// Whether a page passes any value down to the pages below it (`@@tag`).
export function passesDown(pageRel, source) {
	const names = new Set();
	pageInfo(pageRel, source, names);
	return names.size > 0;
}
