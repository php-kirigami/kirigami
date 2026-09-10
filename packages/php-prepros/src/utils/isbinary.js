// Magic-bytes table compiled once at module load
// Key = first byte, value = list of signatures [bytes, length to read]
const MAGIC_MAP = new Map([
	[0x89, [[[0x89, 0x50, 0x4E, 0x47]]]],           // PNG
	[0xFF, [[[0xFF, 0xD8, 0xFF]], [[0xFF, 0xFE]]]],  // JPEG, UTF-16 LE (text BOM)
	[0x47, [[[0x47, 0x49, 0x46]]]],                  // GIF
	[0x25, [[[0x25, 0x50, 0x44, 0x46]]]],             // PDF
	[0x52, [[[0x52, 0x49, 0x46, 0x46]]]],             // WEBP/WAV (RIFF)
	[0x77, [[[0x77, 0x4F, 0x46, 0x46]], [[0x77, 0x4F, 0x46, 0x32]]]],  // WOFF, WOFF2
	[0x1F, [[[0x1F, 0x8B]]]],                       // GZIP
	[0x50, [[[0x50, 0x4B, 0x03, 0x04]]]],             // ZIP
	[0xEF, [[[0xEF, 0xBB, 0xBF]]]],                  // UTF-8 BOM (text!)
	[0xFE, [[[0xFE, 0xFF]]]],                        // UTF-16 BE BOM (text!)
	[0x00, [[[0x00, 0x00, 0xFE, 0xFF]]]],             // UTF-32 BE BOM (text!)
]);

// Text BOMs → never binary, immediate early exit
const TEXT_BOMS = new Set([
	'\xEF\xBB\xBF',   // UTF-8
	'\xFF\xFE',        // UTF-16 LE
	'\xFE\xFF',        // UTF-16 BE
]);

const SAMPLE_SIZE = 512; // 8 KB is overkill for a local mount

/**
 * 3-pass binary detection with aggressive early exit.
 * Optimized to be called on hundreds of files at startup.
 *
 * @param {Buffer} buf - the file's Buffer (readFileSync)
 * @returns {boolean}
 */
function isBinary(buf) {
	const len = buf.length;
	if (len === 0) return false;

	const b0 = buf[0];

	// Pass 1 — Magic bytes (O(1), max 4 comparisons)
	const candidates = MAGIC_MAP.get(b0);
	if (candidates) {
		for (const sigs of candidates) {
			for (const sig of sigs) {
				if (sig.every((b, i) => buf[i] === b)) {
					// Text BOM → immediate "text" exit
					if (b0 === 0xEF || b0 === 0xFE || (b0 === 0xFF && buf[1] === 0xFE)) return false;
					if (b0 === 0x00 && buf[1] === 0x00) return false; // UTF-32
					return true; // Binary confirmed
				}
			}
		}
	}

	const sample = Math.min(len, SAMPLE_SIZE);

	// Pass 2 — NUL byte (a near-certain binary signal, very common in binaries)
	// indexOf is native C++ → much faster than a JS loop
	if (buf.indexOf(0x00, 0, 'binary') !== -1 &&
		buf.indexOf(0x00) < sample) return true;

	// Pass 3 — Statistical ratio over the sample
	let nonText = 0;
	for (let i = 0; i < sample; i++) {
		const b = buf[i];
		if (b < 0x20) {
			// Control characters that are legitimate in text
			if (b !== 0x09 && b !== 0x0A && b !== 0x0D && b !== 0x0C && b !== 0x1B) {
				nonText++;
			}
		} else if (b >= 0x80) {
			nonText++;
		}
	}

	return (nonText / sample) > 0.30;
}


export { isBinary as default }