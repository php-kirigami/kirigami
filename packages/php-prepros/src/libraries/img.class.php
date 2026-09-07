<?php

// IMAGETYPE_AVIF n'existe qu'à partir de PHP 8.1 : on la définit au besoin
if (!defined('IMAGETYPE_AVIF')) {
	define('IMAGETYPE_AVIF', 19);
}

class IMG
{

	private GdImage|null $im = null;
	private array|null $info = null;


	public function __construct(string $file)
	{
		if (!is_file($file) || !is_readable($file)) throw new Exception("Source file unreadable.");

		$this->info = @getimagesize($file);
		if (!$this->info) throw new Exception("Invalid image file.");

		[$srcW, $srcH, $type] = $this->info;
		if ($srcW <= 0 || $srcH <= 0) throw new Exception("Invalid image file.");

		$this->im = match ($type) {
			IMAGETYPE_JPEG => @imagecreatefromjpeg($file),
			IMAGETYPE_PNG  => @imagecreatefrompng($file),
			IMAGETYPE_GIF  => @imagecreatefromgif($file),
			IMAGETYPE_WEBP => (function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($file) : null),
			IMAGETYPE_AVIF => (function_exists('imagecreatefromavif') ? @imagecreatefromavif($file) : null),
			default => throw new Exception("Image format not supported."),
		};

		if (!$this->im) throw new Exception("Image format not supported or GD extension missing support for this format.");
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
	 * L'encodeur AVIF (libavif/aom) utilisé par imageavif() peut échouer
	 * avec "Encoding of color planes failed" dans deux cas fréquents :
	 *  - largeur/hauteur impaire (contrainte du sous-échantillonnage 4:2:0)
	 *  - image trop grande, l'encodeur manquant alors de mémoire pour ses
	 *    buffers internes (aom_codec_encode: "Failed to allocate lag buffers")
	 * On corrige les deux avant d'encoder, sur une copie temporaire, sans
	 * modifier $this->im.
	 */
	private function prepareForAvif(GdImage $im, int $maxDimension = 4000): GdImage
	{
		$w = imagesx($im);
		$h = imagesy($im);

		// Plafonne la résolution si besoin (protection mémoire de l'encodeur).
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

		// Force des dimensions paires.
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
	 * Encode en AVIF avec repli automatique : si l'encodage échoue (memory
	 * error ou autre souci interne d'aom), on retente avec un speed plus
	 * élevé (moins gourmand en mémoire), puis en réduisant la résolution.
	 * Lève une exception explicite si tout échoue, plutôt que de laisser
	 * passer un warning PHP silencieux et un fichier corrompu/absent.
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




}