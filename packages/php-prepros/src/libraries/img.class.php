<?php

if (!defined('IMAGETYPE_AVIF')) define('IMAGETYPE_AVIF', 19);

class IMG
{

	/**
	 * Default raster size (in pixels) used for the longest side when
	 * rasterizing vector formats (SVG, EPS, AI, PDF) via Imagick. Vector
	 * files are resolution-independent, and GD only ever deals in pixels,
	 * so a fallback size is needed for files that don't declare their own
	 * explicit pixel dimensions -- otherwise the underlying delegate
	 * library (librsvg, ghostscript...) may rasterize at a tiny default
	 * (often 100x100). The other side is scaled to preserve the aspect
	 * ratio reported by the file (explicit width/height, or a viewBox);
	 * a file that does declare explicit dimensions is honored as-is.
	 */
	private const VECTOR_DEFAULT_SIZE = 2000;

	/** File extensions treated as vector formats for VECTOR_DEFAULT_SIZE purposes. */
	private const VECTOR_EXTENSIONS = ['svg', 'eps', 'ai', 'pdf'];

	private GdImage|null $im = null;
	private array|null $info = null;


	public function __construct(string $file)
	{
		if (!is_file($file) || !is_readable($file)) throw new Exception("Source file unreadable.");

		$this->info = @getimagesize($file);

		if ($this->info) {
			[$srcW, $srcH, $type] = $this->info;
			if ($srcW <= 0 || $srcH <= 0) throw new Exception("Invalid image file.");

			$this->im = match ($type) {
				IMAGETYPE_JPEG => @imagecreatefromjpeg($file),
				IMAGETYPE_PNG  => @imagecreatefrompng($file),
				IMAGETYPE_GIF  => @imagecreatefromgif($file),
				IMAGETYPE_WEBP => (function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($file) : null),
				IMAGETYPE_AVIF => (function_exists('imagecreatefromavif') ? @imagecreatefromavif($file) : null),
				default => null,
			};
		}

		// Fall back to Imagick for anything GD can't handle: a type GD
		// doesn't recognize at all, a format GD was compiled without
		// support for, or a format getimagesize() itself can't parse
		// (e.g. HEIC, TIFF, BMP).
		if (!$this->im) {
			$this->im = $this->loadFromImagick($file);
		}

		if (!$this->im) throw new Exception("Image format not supported or GD extension missing support for this format.");

		// getimagesize() failed but Imagick managed to decode the file:
		// rebuild a minimal $info from the resulting GD image so the rest
		// of the class (which reads $this->info[2]) keeps working.
		if (!$this->info) {
			$this->info = [imagesx($this->im), imagesy($this->im), IMAGETYPE_PNG];
		}
	}


	/**
	 * Loads an image via Imagick and bridges it back to a GD resource.
	 * Used as a fallback for formats GD itself cannot decode (HEIC, TIFF,
	 * BMP, or any format missing from the compiled GD build). Imagick
	 * converts the image to a PNG blob in memory (preserving alpha), and
	 * GD then decodes that blob normally; nothing is written to disk.
	 */
	private function loadFromImagick(string $file): ?GdImage
	{
		if (!class_exists('Imagick')) return null;

		try {
			$imagick = new Imagick();

			$ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
			if (in_array($ext, self::VECTOR_EXTENSIONS, true)) {
				// Vector formats have no intrinsic pixel size. Ping first
				// to read whatever aspect ratio the file/delegate reports
				// (an explicit width/height, or an SVG viewBox), then
				// rasterize at VECTOR_DEFAULT_SIZE on the longest side
				// while keeping that ratio, instead of forcing a square
				// that could distort the image.
				$probe = new Imagick();
				$probe->pingImage($file);
				$pw = $probe->getImageWidth();
				$ph = $probe->getImageHeight();
				$probe->clear();

				if ($pw > 0 && $ph > 0) {
					$scale = self::VECTOR_DEFAULT_SIZE / max($pw, $ph);
					$targetW = max(1, (int) round($pw * $scale));
					$targetH = max(1, (int) round($ph * $scale));
				} else {
					// Nothing usable to infer a ratio from: fall back to
					// a square canvas.
					$targetW = $targetH = self::VECTOR_DEFAULT_SIZE;
				}

				$imagick->setBackgroundColor(new ImagickPixel('transparent'));
				$imagick->setSize($targetW, $targetH);
			}

			$imagick->readImage($file);

			// If the source has multiple frames/pages (e.g. an animated
			// HEIC sequence, or a multi-page PDF), keep only the first
			// one, matching how GD would have loaded a static image.
			if ($imagick->getNumberImages() > 1) {
				$imagick->setIteratorIndex(0);
			}
			$imagick->setImageFormat('png32'); // 32-bit PNG, keeps alpha channel
			$blob = $imagick->getImageBlob();
			$imagick->clear();
		} catch (\Throwable $e) {
			return null;
		}

		$im = @imagecreatefromstring($blob);
		return $im ?: null;
	}


	public function __get(string $name)
	{
		switch (strtolower($name)) {
			case "w":
			case "width":
				return imagesx($this->im);
			case "h":
			case "height":
				return imagesy($this->im);
		}
	}


	private function setNew(GdImage $im) {
		$this->im = $im;
		return $this;
	}


	public function resize(int $width, int $height = 0, bool $cover = false)
	{
		$srcRatio = $this->width / $this->height;

		if (!$height) {
			$height = $this->height * $width / $this->width;
			$dstRatio = $srcRatio;
		} else {
			$dstRatio = $width / $height;
		}

		if ($cover) { // ===> Cover
			if ($srcRatio > $dstRatio) {
				$cropH = $this->height;
				$cropW = (int) round($this->height * $dstRatio);
			} else {
				$cropW = $this->width;
				$cropH = (int) round($this->width / $dstRatio);
			}

			$srcX = (int) max(0, floor(($this->width - $cropW) / 2));
			$srcY = (int) max(0, floor(($this->height - $cropH) / 2));
			$outW = $width;
			$outH = $height;
			$dst = $this->prepare($outW, $outH);
			$ok = imagecopyresampled($dst, $this->im, 0, 0, $srcX, $srcY, $outW, $outH, $cropW, $cropH);
		} else { // ===> Contain
			$scale = min($width / $this->width, $height / $this->height);
			$outW = (int) max(1, round($this->width * $scale));
			$outH = (int) max(1, round($this->height * $scale));
			$dst = $this->prepare($outW, $outH);
			$ok = imagecopyresampled($dst, $this->im, 0, 0, 0, 0, $outW, $outH, $this->width, $this->height);
		}

		if (!$ok) throw new Exception("Can't resample source image.");

		return $this->setNew($dst);
	}


	private function prepare(int $x, int $y): GdImage
	{
		$img = imagecreatetruecolor($x, $y);
		$hasAlpha = in_array($this->info[2], [IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF, IMAGETYPE_AVIF], true);
		if ($hasAlpha) {
			imagealphablending($img, false);
			imagesavealpha($img, true);
			$transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
			imagefilledrectangle($img, 0, 0, imagesx($img), imagesy($img), $transparent);
		} else {
			$white = imagecolorallocate($img, 255, 255, 255);
			imagefilledrectangle($img, 0, 0, imagesx($img), imagesy($img), $white);
		}
		return $img;
	}


	/**
	 * Converts an sRGB color (0-255) to Lab (D65), a perceptually uniform
	 * color space: a Euclidean distance in Lab roughly matches a color
	 * difference as perceived by the eye, unlike RGB where two colors at
	 * the same numeric "distance" can look very different or identical
	 * depending on the hue.
	 */
	private static function rgbToLab(int $r, int $g, int $b): array
	{
		$toLinear = fn(float $c) => ($c /= 255) <= 0.04045 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
		[$rl, $gl, $bl] = [$toLinear($r), $toLinear($g), $toLinear($b)];

		// Linear RGB -> XYZ (D65), then normalization against the white point.
		$x = ($rl * 0.4124564 + $gl * 0.3575761 + $bl * 0.1804375) / 0.95047;
		$y =  $rl * 0.2126729 + $gl * 0.7151522 + $bl * 0.0721750;
		$z = ($rl * 0.0193339 + $gl * 0.1191920 + $bl * 0.9503041) / 1.08883;

		$f = fn(float $t) => $t > 0.008856 ? $t ** (1 / 3) : (7.787 * $t) + (16 / 116);
		[$fx, $fy, $fz] = [$f($x), $f($y), $f($z)];

		return [(116 * $fy) - 16, 500 * ($fx - $fy), 200 * ($fy - $fz)]; // [L, a, b]
	}


	/**
	 * Extracts the most representative colors from the image.
	 *
	 * Algorithm: median-cut quantization (imagetruecolortopalette, the
	 * same family of technique as Imagick::quantizeImage), heavily
	 * over-sampling the number of requested colors, followed by
	 * perceptual post-processing in Lab space:
	 *  - merging colors that are too close (CIE76 distance in Lab): the
	 *    quantization often produces several hues that look virtually
	 *    identical to the eye, which we don't want as separate entries;
	 *  - excluding near-pure white/black via the L lightness component
	 *    (reliable regardless of hue, unlike a threshold on raw r/g/b).
	 *
	 * @param int   $numColors                Number of colors to return.
	 * @param float $mergeTolerance           Lab distance below which two colors are merged (0-100, ~6-10 = "near identical").
	 * @param bool  $excludeNearWhiteAndBlack Excludes near-white/near-black colors.
	 * @param float $lightnessThreshold       Lab lightness threshold (0-100) above/below which a color is considered near-white/near-black.
	 * @return string[] Colors as "#rrggbb", sorted by descending frequency.
	 */
	public function getRepresentativeColors(
		int $numColors = 5,
		float $mergeTolerance = 8.0,
		bool $excludeNearWhiteAndBlack = true,
		float $lightnessThreshold = 8.0
	): array {
		$srcW = $this->width;
		$srcH = $this->height;

		// Analyzing at full resolution brings nothing for this kind of
		// extraction and is expensive in compute time.
		$maxDim = 150;
		$scale = min(1, $maxDim / max($srcW, $srcH));
		$w = max(1, (int) round($srcW * $scale));
		$h = max(1, (int) round($srcH * $scale));

		// Flatten onto a white background (as for JPEG export): otherwise
		// the transparent areas of PNG/WEBP images would default to being
		// counted as black on a truecolor canvas.
		$sample = imagecreatetruecolor($w, $h);
		imagealphablending($sample, true);
		$white = imagecolorallocate($sample, 255, 255, 255);
		imagefilledrectangle($sample, 0, 0, $w, $h, $white);
		imagecopyresampled($sample, $this->im, 0, 0, 0, 0, $w, $h, $srcW, $srcH);

		// We heavily over-sample the number of requested colors: this
		// leaves enough room for the perceptual merge and the white/black
		// exclusion below without running short of colors.
		$buckets = max($numColors * 6, 24);
		imagetruecolortopalette($sample, false, $buckets);

		// Count occurrences of each color in the generated palette.
		$counts = array_fill(0, imagecolorstotal($sample), 0);
		for ($y = 0; $y < $h; $y++) {
			for ($x = 0; $x < $w; $x++) {
				$counts[imagecolorat($sample, $x, $y)]++;
			}
		}

		$entries = [];
		foreach ($counts as $index => $count) {
			if ($count === 0) continue;
			$rgb = imagecolorsforindex($sample, $index);
			$lab = self::rgbToLab($rgb['red'], $rgb['green'], $rgb['blue']);

			if ($excludeNearWhiteAndBlack && ($lab[0] > 100 - $lightnessThreshold || $lab[0] < $lightnessThreshold)) {
				continue;
			}

			$entries[] = ['r' => $rgb['red'], 'g' => $rgb['green'], 'b' => $rgb['blue'], 'lab' => $lab, 'count' => $count];
		}

		usort($entries, fn($a, $b) => $b['count'] - $a['count']);

		// Merge perceptually close colors by grouping their occurrences,
		// always starting from the most frequent one.
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
	 * The AVIF encoder (libavif/aom) used by imageavif() can fail with
	 * "Encoding of color planes failed" in two common cases:
	 *  - odd width/height (4:2:0 chroma subsampling constraint)
	 *  - image too large, causing the encoder to run out of memory for
	 *    its internal buffers ("aom_codec_encode: Failed to allocate lag buffers")
	 * We fix both before encoding, on a temporary copy, without modifying
	 * $this->im.
	 */
	private function prepareForAvif(GdImage $im, int $maxDimension = 4000): GdImage
	{
		$w = imagesx($im);
		$h = imagesy($im);

		// Cap the resolution if needed (encoder memory protection).
		if ($w > $maxDimension || $h > $maxDimension) {
			$scale = min($maxDimension / $w, $maxDimension / $h);
			$newW = max(1, (int) round($w * $scale));
			$newH = max(1, (int) round($h * $scale));
			$resized = imagecreatetruecolor($newW, $newH);
			imagealphablending($resized, false);
			imagesavealpha($resized, true);
			$transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
			imagefilledrectangle($resized, 0, 0, $newW, $newH, $transparent);
			imagecopyresampled($resized, $im, 0, 0, 0, 0, $newW, $newH, $w, $h);
			$im = $resized;
			$w = $newW;
			$h = $newH;
		}

		// Force even dimensions.
		$w2 = $w % 2 ? $w + 1 : $w;
		$h2 = $h % 2 ? $h + 1 : $h;
		if ($w2 !== $w || $h2 !== $h) {
			$padded = imagecreatetruecolor($w2, $h2);
			imagealphablending($padded, false);
			imagesavealpha($padded, true);
			$transparent = imagecolorallocatealpha($padded, 0, 0, 0, 127);
			imagefilledrectangle($padded, 0, 0, $w2, $h2, $transparent);
			imagecopy($padded, $im, 0, 0, 0, 0, $w, $h);
			$im = $padded;
		}

		return $im;
	}


	/**
	 * Encodes to AVIF with automatic fallback: if encoding fails (memory
	 * error or another internal aom issue), retry with a higher speed
	 * (less memory-hungry), then with a reduced resolution. Throws an
	 * explicit exception if everything fails, instead of letting a silent
	 * PHP warning through and leaving a corrupted/missing file behind.
	 */
	private function encodeAvif(GdImage $im, string $dest, int $quality = 82): bool
	{
		$attempts = [
			['maxDimension' => 4000, 'speed' => 4],
			['maxDimension' => 4000, 'speed' => 8],
			['maxDimension' => 2000, 'speed' => 8],
		];

		foreach ($attempts as $attempt) {
			$prepared = $this->prepareForAvif($im, $attempt['maxDimension']);
			$ok = @imageavif($prepared, $dest, $quality, $attempt['speed']);
			if ($ok && is_file($dest) && filesize($dest) > 0) return true;
		}

		return false;
	}


	public function save(string $dest): self
	{
		$ext = strtolower(pathinfo($dest, PATHINFO_EXTENSION));
		$dir = pathinfo($dest, PATHINFO_DIRNAME);
		if (!is_dir($dir) && !@mkdir($dir, 0777, true)) throw new Exception("Invalid destination.");
		$ok = match ($ext) {
			'jpg', 'jpeg' => imagejpeg($this->im, $dest, 82),
			'png'         => imagepng($this->im, $dest, 6),
			'gif'         => imagegif($this->im, $dest),
			'webp'        => (function_exists('imagewebp') ? imagewebp($this->im, $dest, 82) : false),
			'avif'        => (function_exists('imageavif') ? $this->encodeAvif($this->im, $dest, 82) : false),
			default       => throw new Exception("Invalid output file type.")
		};
		if (!$ok) throw new Exception("Failed to encode image as '{$ext}'.");
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


	public static function palette(string $path, $colors = 5)
	{
		$srcfile = FS::pathJoin(PREPROS::$config->image->source, $path);
		if(!$srcinfo = PREPROS::fstat($srcfile)) throw new Exception("Invalid image file.");
		$key = 'palette_' . STR::shorthash("{$srcfile}:{$srcinfo->modifiedAt}:{$colors}");
		if($palette = CACHE::get($key)) return $palette;
		if(!$localfile = current(PREPROS::mount($srcfile))) throw new Exception("Can't mount image.");
		if(!$palette = (new self($localfile))->getRepresentativeColors($colors)) throw new Exception("Can't extract palette from image \"{$path}\".");
		CACHE::set($key, $palette);
		return $palette;
	}




}