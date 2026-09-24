// ---------------------------------------------------------------------------
// Zero-dependency tar reader. Node has no archive API; GitHub serves every
// repository as a .tar.gz, which node:zlib inflates. Parses the tar format
// itself: 512-byte blocks, ustar headers, plus the pax "x" and GNU "L"
// extensions GitHub uses for long paths.
// ---------------------------------------------------------------------------

// Returns [{ name, type: 'file' | 'dir', data: Buffer | null }].
export function parseTar(buf) {
	const entries = [];
	let offset = 0;
	let longName = null;   // GNU 'L' header → name of the next entry
	let paxName = null;    // pax 'x' header → "path" field of the next entry

	while (offset + 512 <= buf.length) {
		const header = buf.subarray(offset, offset + 512);
		offset += 512;

		// An all-zero block marks the end of the archive.
		if (header.every(b => b === 0)) break;

		const readStr = (start, len) => {
			const raw = header.subarray(start, start + len);
			const end = raw.indexOf(0);
			return raw.toString('utf8', 0, end === -1 ? len : end);
		};
		const readOctal = (start, len) => {
			const s = readStr(start, len).trim();
			return s ? parseInt(s, 8) : 0;
		};

		let name = readStr(0, 100);
		const size = readOctal(124, 12);
		const type = String.fromCharCode(header[156]);
		const prefix = readStr(345, 155);
		if (prefix) name = `${prefix}/${name}`;

		const data = buf.subarray(offset, offset + size);
		offset += Math.ceil(size / 512) * 512;

		if (type === 'L') { longName = data.toString('utf8').replace(/\0+$/, ''); continue; }
		if (type === 'x' || type === 'g') {
			const m = data.toString('utf8').match(/\d+ path=([^\n]+)\n/);
			if (m && type === 'x') paxName = m[1];
			continue;
		}

		if (longName) { name = longName; longName = null; }
		if (paxName) { name = paxName; paxName = null; }

		entries.push({
			name,
			type: type === '5' ? 'dir' : 'file',
			data: type === '5' ? null : data,
		});
	}

	return entries;
}
