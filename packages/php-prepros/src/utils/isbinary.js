// Table de magic bytes compilée une seule fois au module load
// Clé = premier octet, valeur = liste de signatures [octets, longueur à lire]
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

// BOMs texte → jamais binaire, early exit immédiat
const TEXT_BOMS = new Set([
	'\xEF\xBB\xBF',   // UTF-8
	'\xFF\xFE',        // UTF-16 LE
	'\xFE\xFF',        // UTF-16 BE
]);

const SAMPLE_SIZE = 512; // 8 Ko c'est inutile pour un mount local

/**
 * Détection binaire en 3 passes avec early exit agressif.
 * Optimisé pour être appelé sur des centaines de fichiers au démarrage.
 *
 * @param {Buffer} buf - Buffer du fichier (readFileSync)
 * @returns {boolean}
 */
function isBinary(buf) {
	const len = buf.length;
	if (len === 0) return false;

	const b0 = buf[0];

	// Passe 1 — Magic bytes (O(1), max 4 comparaisons)
	const candidates = MAGIC_MAP.get(b0);
	if (candidates) {
		for (const sigs of candidates) {
			for (const sig of sigs) {
				if (sig.every((b, i) => buf[i] === b)) {
					// BOM texte → sortie immédiate "text"
					if (b0 === 0xEF || b0 === 0xFE || (b0 === 0xFF && buf[1] === 0xFE)) return false;
					if (b0 === 0x00 && buf[1] === 0x00) return false; // UTF-32
					return true; // Binaire confirmé
				}
			}
		}
	}

	const sample = Math.min(len, SAMPLE_SIZE);

	// Passe 2 — Octet NUL (signal binaire quasi-certain, très fréquent dans les binaires)
	// indexOf est natif C++ → beaucoup plus rapide qu'une boucle JS
	if (buf.indexOf(0x00, 0, 'binary') !== -1 &&
		buf.indexOf(0x00) < sample) return true;

	// Passe 3 — Ratio statistique sur l'échantillon
	let nonText = 0;
	for (let i = 0; i < sample; i++) {
		const b = buf[i];
		if (b < 0x20) {
			// Caractères de contrôle légitimes en texte
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