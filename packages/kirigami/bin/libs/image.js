import sharp from 'sharp';

/**
 * Convertit une couleur sRGB (0-255) en Lab (D65), espace perceptuellement
 * uniforme : une distance euclidienne en Lab correspond (à peu près) à une
 * différence de couleur telle que perçue par l'œil, contrairement au RGB
 * où deux couleurs à la même "distance" numérique peuvent paraître très
 * différentes ou identiques selon la teinte.
 */
function rgbToLab(r, g, b) {
	const toLinear = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
	const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);

	// Linéaire RGB -> XYZ (D65), puis normalisation par le point blanc.
	const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
	const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
	const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

	const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
	const fx = f(x), fy = f(y), fz = f(z);

	return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]; // [L, a, b]
}

/**
 * Quantization median-cut : divise récursivement la boîte englobante des
 * couleurs selon le canal de plus grande étendue, en priorisant les boîtes
 * les plus "peuplées" (étendue x population), jusqu'à atteindre le nombre
 * de buckets demandé. Chaque bucket est ensuite réduit à sa couleur
 * moyenne, pondérée par le nombre d'occurrences.
 *
 * C'est la même famille de technique que Imagick::quantizeImage() ou
 * imagetruecolortopalette() côté PHP.
 */
function medianCutQuantize(pixels, targetBuckets) {
	let boxes = [pixels];

	while (boxes.length < targetBuckets) {
		let boxIndex = -1;
		let bestScore = -1;
		let bestChannel = 'r';

		for (let i = 0; i < boxes.length; i++) {
			const box = boxes[i];
			if (box.length < 2) continue;

			for (const ch of ['r', 'g', 'b']) {
				let min = Infinity, max = -Infinity;
				for (const p of box) {
					if (p[ch] < min) min = p[ch];
					if (p[ch] > max) max = p[ch];
				}
				const population = box.reduce((s, p) => s + p.count, 0);
				const score = (max - min) * population;
				if (score > bestScore) {
					bestScore = score;
					boxIndex = i;
					bestChannel = ch;
				}
			}
		}

		if (boxIndex === -1) break; // plus aucune boîte n'est divisible

		const box = boxes[boxIndex];
		box.sort((a, b) => a[bestChannel] - b[bestChannel]);

		// Découpe à la médiane pondérée par occurrence, pas juste au milieu
		// du tableau, pour équilibrer la population des deux moitiés.
		const total = box.reduce((s, p) => s + p.count, 0);
		let acc = 0, splitAt = 0;
		for (let i = 0; i < box.length; i++) {
			acc += box[i].count;
			if (acc >= total / 2) { splitAt = i + 1; break; }
		}
		if (splitAt === 0 || splitAt === box.length) splitAt = Math.floor(box.length / 2) || 1;

		boxes.splice(boxIndex, 1, box.slice(0, splitAt), box.slice(splitAt));
	}

	return boxes.map((box) => {
		let sr = 0, sg = 0, sb = 0, count = 0;
		for (const p of box) {
			sr += p.r * p.count;
			sg += p.g * p.count;
			sb += p.b * p.count;
			count += p.count;
		}
		return { r: Math.round(sr / count), g: Math.round(sg / count), b: Math.round(sb / count), count };
	});
}

/**
 * Extrait les couleurs les plus représentatives d'une image.
 *
 * @param {string|Buffer} input                     Chemin de fichier ou Buffer, tout ce qu'accepte sharp().
 * @param {object}  [options]
 * @param {number}  [options.numColors=5]                    Nombre de couleurs à retourner.
 * @param {number}  [options.mergeTolerance=8]               Distance Lab en-dessous de laquelle deux couleurs sont fusionnées (~6-10 = "quasi identiques").
 * @param {boolean} [options.excludeNearWhiteAndBlack=true]  Exclut les couleurs quasi blanches/noires.
 * @param {number}  [options.lightnessThreshold=8]           Seuil de luminance Lab (0-100) en-deçà/au-delà duquel une couleur est jugée quasi blanche/noire.
 * @param {number}  [options.maxDim=150]                     Dimension max de l'échantillon analysé (perf).
 * @returns {Promise<string[]>} Couleurs au format "#rrggbb", triées par fréquence décroissante.
 */
async function getRepresentativeColors(input, options = {}) {
	const {
		numColors = 5,
		mergeTolerance = 8.0,
		excludeNearWhiteAndBlack = true,
		lightnessThreshold = 8.0,
		maxDim = 150,
	} = options;

	// Analyser la pleine résolution n'apporte rien pour ce genre
	// d'extraction et coûte cher en temps de calcul. flatten() aplatit la
	// transparence sur fond blanc (sinon les zones transparentes des
	// PNG/WEBP seraient comptées comme du noir).
	const { data, info } = await sharp(input)
		.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
		.flatten({ background: '#ffffff' })
		.raw()
		.toBuffer({ resolveWithObject: true });

	const { width, height, channels } = info;

	// Regroupe les pixels identiques en amont : ça limite le nombre
	// d'entrées à traiter par le median-cut et accélère nettement le tri.
	const colorMap = new Map();
	for (let i = 0; i < width * height; i++) {
		const o = i * channels;
		const key = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2];
		colorMap.set(key, (colorMap.get(key) || 0) + 1);
	}

	const pixels = [];
	for (const [key, count] of colorMap) {
		pixels.push({ r: (key >> 16) & 255, g: (key >> 8) & 255, b: key & 255, count });
	}

	// On sur-échantillonne largement le nombre de couleurs demandées : ça
	// laisse de la marge pour la fusion perceptuelle et l'exclusion du
	// blanc/noir ci-dessous sans se retrouver à court de couleurs.
	const buckets = Math.min(Math.max(numColors * 6, 24), pixels.length);
	let entries = medianCutQuantize(pixels, buckets).map((c) => ({ ...c, lab: rgbToLab(c.r, c.g, c.b) }));

	if (excludeNearWhiteAndBlack) {
		entries = entries.filter((e) => e.lab[0] <= 100 - lightnessThreshold && e.lab[0] >= lightnessThreshold);
	}

	entries.sort((a, b) => b.count - a.count);

	// Fusionne les couleurs perceptuellement proches (distance CIE76 en
	// Lab) en regroupant leurs occurrences, en partant toujours de la
	// plus fréquente. Le median-cut sort souvent plusieurs teintes quasi
	// identiques à l'œil, qu'on ne veut pas voir comme des entrées séparées.
	const merged = [];
	for (const entry of entries) {
		const cluster = merged.find((c) => {
			const dl = c.lab[0] - entry.lab[0];
			const da = c.lab[1] - entry.lab[1];
			const db = c.lab[2] - entry.lab[2];
			return Math.sqrt(dl * dl + da * da + db * db) <= mergeTolerance;
		});
		if (cluster) cluster.count += entry.count;
		else merged.push({ ...entry });
	}

	merged.sort((a, b) => b.count - a.count);

	return merged
		.slice(0, numColors)
		.map((c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join(''));
}

export { getRepresentativeColors };

// Exemple d'utilisation :
// import { getRepresentativeColors } from './getRepresentativeColors.js';
// const colors = await getRepresentativeColors('./photo.jpg', { numColors: 5 });
// console.log(colors); // => ['#3a6b8f', '#e0c14c', '#7a2d2d', '#1e1e1e', '#c9c9c9']