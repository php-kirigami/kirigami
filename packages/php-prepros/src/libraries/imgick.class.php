<?php

class IMG
{

	private Imagick $im;

	// Extensions vectorielles : sans résolution explicite, Imagick
	// rasterise à 72dpi par défaut, ce qui donne un rendu flou dès qu'on
	// redimensionne à une taille plus grande.
	private const VECTOR_EXTENSIONS = ['svg', 'svgz', 'pdf', 'eps', 'ai'];
	private const RENDER_RESOLUTION = 300;


	public function __construct(string $file)
	{
		if (!is_file($file) || !is_readable($file)) throw new Exception("Source file unreadable.");

		$this->im = new Imagick();

		$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
		if (in_array($ext, self::VECTOR_EXTENSIONS, true)) {
			$this->im->setResolution(self::RENDER_RESOLUTION, self::RENDER_RESOLUTION);
		}

		try {
			// Le suffixe [0] ne charge que la première image : la page
			// composite/aplatie pour les formats multi-calques ou
			// multi-pages (PSD, PDF, TIFF, ICO, GIF animé...), plutôt que
			// toutes les frames/calques.
			$this->im->readImage($file . '[0]');
		} catch (\ImagickException $e) {
			throw new Exception("Invalid image file or format not supported.");
		}

		if ($this->im->getImageWidth() <= 0 || $this->im->getImageHeight() <= 0) {
			throw new Exception("Invalid image file.");
		}

		// Filet de sécurité si [0] n'a pas suffi à limiter à une seule image.
		if ($this->im->getNumberImages() > 1) {
			$this->im->setIteratorIndex(0);
			$this->im = $this->im->getImage();
		}

		// Les fichiers destinés à l'impression (PSD notamment) sont
		// parfois en CMJN : on reconvertit en sRGB pour un rendu correct
		// à l'écran et une compatibilité garantie avec tous les formats
		// de sortie (JPEG/PNG/WEBP/AVIF n'acceptent pas tous le CMJN).
		if ($this->im->getImageColorspace() === Imagick::COLORSPACE_CMYK) {
			$this->im->transformImageColorspace(Imagick::COLORSPACE_SRGB);
		}
	}


	public function __get(string $name)
	{
		switch (strtolower($name)) {
			case "w":
			case "width":
				return $this->im->getImageWidth();
			case "h":
			case "height":
				return $this->im->getImageHeight();
		}
	}


	public function resize(int $width, int $height = 0, bool $cover = false): self
	{
		$srcW = $this->width;
		$srcH = $this->height;

		if (!$height) {
			$height = (int) round($srcH * $width / $srcW);
		}

		if ($cover) { // ===> Cover
			$srcRatio = $srcW / $srcH;
			$dstRatio = $width / $height;

			if ($srcRatio > $dstRatio) {
				$cropH = $srcH;
				$cropW = (int) round($srcH * $dstRatio);
			} else {
				$cropW = $srcW;
				$cropH = (int) round($srcW / $dstRatio);
			}

			$srcX = (int) max(0, floor(($srcW - $cropW) / 2));
			$srcY = (int) max(0, floor(($srcH - $cropH) / 2));

			// Le filtre est choisi sur le facteur d'échelle réel appliqué
			// à la zone recadrée (crop manuel plutôt que
			// cropThumbnailImage, qui ne permet pas de choisir le filtre).
			$filter = ($width / $cropW) > 1 ? Imagick::FILTER_MITCHELL : Imagick::FILTER_LANCZOS;

			$this->im->cropImage($cropW, $cropH, $srcX, $srcY);
			$this->im->setImagePage(0, 0, 0, 0); // reset l'offset de canvas laissé par le crop

			$ok = $this->im->resizeImage($width, $height, $filter, 1);
		} else { // ===> Contain
			$scale = min($width / $srcW, $height / $srcH);

			// Mitchell donne un rendu plus net en upscale (moins de flou
			// qu'un Lanczos), Lanczos reste préférable en downscale
			// (meilleur anti-aliasing, moins d'aliasing/moiré).
			$filter = $scale > 1 ? Imagick::FILTER_MITCHELL : Imagick::FILTER_LANCZOS;

			// bestfit = true : redimensionne en conservant le ratio, la
			// taille finale peut être < width/height (pas de padding),
			// comme dans la version GD.
			$ok = $this->im->resizeImage($width, $height, $filter, 1, true);
		}

		if (!$ok) throw new Exception("Can't resample source image.");

		return $this;
	}


	/**
	 * Convertit une couleur sRGB (0-255) en Lab (D65), espace
	 * perceptuellement uniforme : une distance euclidienne en Lab
	 * correspond (à peu près) à une différence de couleur telle que
	 * perçue par l'œil, contrairement au RGB où deux couleurs à la même
	 * "distance" numérique peuvent paraître très différentes ou
	 * identiques selon la teinte.
	 */
	private static function rgbToLab(int $r, int $g, int $b): array
	{
		$toLinear = fn(float $c) => ($c /= 255) <= 0.04045 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
		[$rl, $gl, $bl] = [$toLinear($r), $toLinear($g), $toLinear($b)];

		// Linéaire RGB -> XYZ (D65), puis normalisation par le point blanc.
		$x = ($rl * 0.4124564 + $gl * 0.3575761 + $bl * 0.1804375) / 0.95047;
		$y =  $rl * 0.2126729 + $gl * 0.7151522 + $bl * 0.0721750;
		$z = ($rl * 0.0193339 + $gl * 0.1191920 + $bl * 0.9503041) / 1.08883;

		$f = fn(float $t) => $t > 0.008856 ? $t ** (1 / 3) : (7.787 * $t) + (16 / 116);
		[$fx, $fy, $fz] = [$f($x), $f($y), $f($z)];

		return [(116 * $fy) - 16, 500 * ($fx - $fy), 200 * ($fy - $fz)]; // [L, a, b]
	}


	/**
	 * Extrait les couleurs les plus représentatives de l'image.
	 *
	 * Algo : quantization median-cut (Imagick::quantizeImage, la même
	 * technique qu'utilisent la plupart des libs d'extraction de
	 * palette), en sur-échantillonnant largement le nombre de couleurs
	 * demandées, puis post-traitement perceptuel dans l'espace Lab :
	 *  - fusion des couleurs trop proches (distance CIE76 en Lab) : le
	 *    median-cut sort souvent plusieurs teintes quasi identiques à
	 *    l'œil, qu'on ne veut pas voir comme des entrées séparées ;
	 *  - exclusion du blanc/noir quasi purs via la luminance L (fiable
	 *    quelle que soit la teinte, contrairement à un seuil sur r/g/b).
	 *
	 * @param int   $numColors                Nombre de couleurs à retourner.
	 * @param float $mergeTolerance           Distance Lab en-dessous de laquelle deux couleurs sont fusionnées (0-100, ~6-10 = "quasi identiques").
	 * @param bool  $excludeNearWhiteAndBlack Exclut les couleurs quasi blanches/noires.
	 * @param float $lightnessThreshold       Seuil de luminance Lab (0-100) au-delà/en-deçà duquel une couleur est jugée quasi blanche/noire.
	 * @return string[] Couleurs au format "#rrggbb", triées par fréquence décroissante.
	 */
	public function getRepresentativeColors(
		int $numColors = 5,
		float $mergeTolerance = 8.0,
		bool $excludeNearWhiteAndBlack = true,
		float $lightnessThreshold = 8.0
	): array {
		$sample = clone $this->im;
		if ($sample->getNumberImages() > 1) {
			$sample->setIteratorIndex(0);
			$sample = $sample->getImage();
		}

		// Analyser la pleine résolution n'apporte rien pour ce genre
		// d'extraction et coûte cher en temps de calcul.
		$maxDim = 150;
		if ($sample->getImageWidth() > $maxDim || $sample->getImageHeight() > $maxDim) {
			$sample->resizeImage($maxDim, $maxDim, Imagick::FILTER_BOX, 1, true);
		}
		$sample->setImageColorspace(Imagick::COLORSPACE_SRGB);

		// On sur-échantillonne largement le nombre de couleurs demandées :
		// ça laisse de la marge pour la fusion perceptuelle et l'exclusion
		// du blanc/noir ci-dessous sans se retrouver à court de couleurs.
		$sample->quantizeImage(max($numColors * 6, 24), Imagick::COLORSPACE_RGB, 0, false, false);

		$entries = [];
		foreach ($sample->getImageHistogram() as $pixel) {
			$rgb = $pixel->getColor();
			$lab = self::rgbToLab($rgb['r'], $rgb['g'], $rgb['b']);

			if ($excludeNearWhiteAndBlack && ($lab[0] > 100 - $lightnessThreshold || $lab[0] < $lightnessThreshold)) {
				continue;
			}

			$entries[] = ['r' => $rgb['r'], 'g' => $rgb['g'], 'b' => $rgb['b'], 'lab' => $lab, 'count' => $pixel->getColorCount()];
		}

		usort($entries, fn($a, $b) => $b['count'] - $a['count']);

		// Fusionne les couleurs perceptuellement proches en regroupant
		// leurs occurrences, en partant toujours de la plus fréquente.
		$merged = [];
		foreach ($entries as $entry) {
			foreach ($merged as &$cluster) {
				$dl = $cluster['lab'][0] - $entry['lab'][0];
				$da = $cluster['lab'][1] - $entry['lab'][1];
				$db = $cluster['lab'][2] - $entry['lab'][2];
				if (sqrt($dl * $dl + $da * $da + $db * $db) <= $mergeTolerance) {
					$cluster['count'] += $entry['count'];
					continue 2;
				}
			}
			unset($cluster);
			$merged[] = $entry;
		}

		usort($merged, fn($a, $b) => $b['count'] - $a['count']);

		return array_map(
			fn($c) => sprintf('#%02x%02x%02x', $c['r'], $c['g'], $c['b']),
			array_slice($merged, 0, $numColors)
		);
	}


	/**
	 * L'encodeur AVIF (libaom, via ImageMagick) peut échouer sur des images
	 * trop grandes (buffers internes) ou nécessite parfois des dimensions
	 * paires selon le sous-échantillonnage. On corrige les deux sur une
	 * copie temporaire, sans modifier $this->im.
	 */
	private function prepareForAvif(Imagick $im, int $maxDimension = 4000): Imagick
	{
		$w = $im->getImageWidth();
		$h = $im->getImageHeight();

		if ($w > $maxDimension || $h > $maxDimension) {
			$im->resizeImage($maxDimension, $maxDimension, Imagick::FILTER_LANCZOS, 1, true);
			$w = $im->getImageWidth();
			$h = $im->getImageHeight();
		}

		$w2 = $w % 2 ? $w + 1 : $w;
		$h2 = $h % 2 ? $h + 1 : $h;
		if ($w2 !== $w || $h2 !== $h) {
			$im->setImageBackgroundColor(new ImagickPixel('transparent'));
			$im->extentImage($w2, $h2, 0, 0);
		}

		return $im;
	}


	/**
	 * Encode en AVIF avec repli automatique : si l'encodage échoue, on
	 * retente en réduisant progressivement la résolution maximale.
	 * Lève une exception explicite si tout échoue.
	 */
	private function encodeAvif(Imagick $im, string $dest, int $quality = 82): bool
	{
		$attempts = [4000, 2000, 1000];

		foreach ($attempts as $maxDimension) {
			$copy = clone $im;
			$copy = $this->prepareForAvif($copy, $maxDimension);
			try {
				$copy->setImageFormat('avif');
				$copy->setImageCompressionQuality($quality);
				$ok = $copy->writeImage($dest);
			} catch (\ImagickException $e) {
				$ok = false;
			}
			if ($ok && is_file($dest) && filesize($dest) > 0) return true;
		}

		return false;
	}


	public function save(string $dest): self
	{
		$ext = strtolower(pathinfo($dest, PATHINFO_EXTENSION));
		$dir = pathinfo($dest, PATHINFO_DIRNAME);
		if (!is_dir($dir) && !@mkdir($dir, 0777, true)) throw new Exception("Invalid destination.");

		$formats = ['jpg' => 'jpeg', 'jpeg' => 'jpeg', 'png' => 'png', 'gif' => 'gif', 'webp' => 'webp', 'avif' => 'avif'];
		if (!isset($formats[$ext])) throw new Exception("Invalid output file type.");

		try {
			if ($ext === 'avif') {
				$ok = $this->encodeAvif($this->im, $dest, 82);
			} else {
				$im = $this->im;

				// JPEG ne supporte pas la transparence : on aplatit sur
				// fond blanc si l'image source avait un canal alpha
				// (contrairement à la version GD, qui décidait ça selon
				// le format source et pouvait produire un fond noir).
				if (in_array($ext, ['jpg', 'jpeg'], true) && $im->getImageAlphaChannel()) {
					$im = clone $im;
					$im->setImageBackgroundColor(new ImagickPixel('white'));
					$im = $im->mergeImageLayers(Imagick::LAYERMETHOD_FLATTEN);
				}

				$im->setImageFormat($formats[$ext]);

				match ($ext) {
					'jpg', 'jpeg' => $im->setImageCompressionQuality(82),
					'webp'        => $im->setImageCompressionQuality(82),
					'png'         => $im->setOption('png:compression-level', '6'),
					default       => null,
				};

				$ok = $im->writeImage($dest);
			}
		} catch (\ImagickException $e) {
			throw new Exception("Failed to encode image as '{$ext}': " . $e->getMessage());
		}

		if (!$ok || !is_file($dest) || filesize($dest) === 0) {
			throw new Exception("Failed to encode image as '{$ext}'.");
		}

		PREPROS::exportFile(realpath($dest));
		return $this;
	}


	public static function asset(string $path, $width = 0, $height = 0, $cover = false, $backtrace = '')
	{
		$srcfile = FS::pathJoin(PREPROS::$config->image->source, $path);
		if(!$srcinfo = PREPROS::fstat($srcfile)) throw new Exception("Invalid image file.");

		$suffix = '';
		if ($width && $height) $suffix = $cover ? '-' . $width . 'x' . $height . '-cover' : '-' . $width . 'x' . $height;
		elseif ($width) $suffix = '-' . $width . 'w';
		elseif ($height) $suffix = '-' . $height . 'h';
		$destname = preg_replace('/\.[a-z]{2,4}+$/i', '', $path) . $suffix . '.' . PREPROS::$config->image->format;
		$destfile = FS::pathJoin(PREPROS::$config->data->root, PREPROS::$config->image->dest, $destname);
		$destinfo = PREPROS::fstat($destfile);

		if(!$destinfo || ((strtotime($srcinfo->modifiedAt) - strtotime($destinfo->modifiedAt)) > 10)) {
			if(!$localfile = current(PREPROS::mount($srcfile))) throw new Exception("Can't mount image.");
			if(!is_file($localfile)) throw new Exception("Can't mount image.");
			$img = new self($localfile);
			if ($width && $height) $img->resize($width, $height, $cover);
			elseif ($width) $img->resize($width);
			elseif ($height) $img->resize((int) round($img->width * $height / $img->height), $height);
			$img->save(FS::pathJoin('/project', $destfile));
		}

		if(!$backtrace) $backtrace = PREPROS::backtraceFile();
		return FS::getRelativePath($backtrace, FS::pathJoin('/project', $destfile));
	}

}