<?php

SYS::requireExtension('gd');


class IMG
{

	private $im = null;
	private $info = null;


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
			default => throw new Exception("Image format not supported."),
		};
	}


	public function __get($name)
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


	private function setNew($im) {
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
		$hasAlpha = in_array($this->info[2], [IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true);
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


	public function save($dest): self
	{
		$ext = strtolower(pathinfo($dest, PATHINFO_EXTENSION));
		$dir = pathinfo($dest, PATHINFO_DIRNAME);
		if (!is_dir($dir) && !@mkdir($dir, 0777, true)) throw new Exception("Invalid destination.");
		match ($ext) {
			'jpg', 'jpeg' => imagejpeg($this->im, $dest, 85),
			'png'         => imagepng($this->im, $dest, 6),
			'gif'         => imagegif($this->im, $dest),
			'webp'        => (function_exists('imagewebp') ? imagewebp($this->im, $dest, 85) : false),
			default       => throw new Exception("Invalid output file type.")
		};
		return $this;
	}
}
