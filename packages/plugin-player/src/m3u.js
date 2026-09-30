// Minimal M3U / M3U8 reader: `#EXTINF:<seconds>,<Artist - Title>` lines apply
// to the entry that follows; other `#` lines and blanks are skipped. Entry
// paths are returned as written (relative to the playlist file).

export function parseM3u(text) {
	const entries = [];
	let info = null;
	for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) continue;
		if (line.startsWith('#')) {
			const m = /^#EXTINF:\s*-?\d+(?:\.\d+)?\s*,\s*(.*)$/i.exec(line);
			if (m) info = m[1].trim();
			continue;
		}
		const entry = { path: line.replaceAll('\\', '/') };
		if (info) {
			const split = info.indexOf(' - ');
			if (split > 0) {
				entry.artist = info.slice(0, split).trim();
				entry.title = info.slice(split + 3).trim();
			} else {
				entry.title = info;
			}
		}
		entries.push(entry);
		info = null;
	}
	return entries;
}
