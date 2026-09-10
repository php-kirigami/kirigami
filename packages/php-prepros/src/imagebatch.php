<?php

/**
 * Batch image worker for the Kirigami build pipeline.
 *
 * Driven by @kirigami/kirigami's `sass` task (see processImages() in
 * prepros.js): it receives a JSON list of jobs on $argv[2] and runs them
 * through the IMG class (GD, with the Imagick fallback) so that the Sass
 * `img-asset()` / `colors()` functions and the PHP `IMG::asset()` /
 * `<img asset>` tag all share one engine.
 *
 * Job shapes:
 *   { "op": "resize", "src": "hero.jpg", "width": 800, "height": 0,
 *     "cover": false, "quality": 82,
 *     "dests": ["/project/dist/images/hero-800w.webp",
 *               "/project/src/images/hero-800w.webp"] }
 *   { "op": "palette", "src": "hero.jpg", "count": 5 }
 *
 * `src` is resolved against `image.source`; `dests` are absolute virtual
 * paths already carrying the target extension. Staleness is decided on the
 * JS side, so every job listed here is meant to run. Generated files are
 * returned through PREPROS::exportFile() (STD::succeed copies them back to
 * the host); extracted palettes ride back in the `colors` map.
 */

include(__DIR__ . '/utils.inc.php');

try {

	$jobs = json_decode($argv[2] ?? '[]');
	if (!is_array($jobs)) throw new Exception("Invalid jobs payload.");

	$colors = [];

	foreach ($jobs as $job) {

		if (($job->op ?? '') === 'palette') {
			$count = (int) ($job->count ?? 5);
			$colors[$job->src . ':' . $count] = IMG::palette($job->src, $count);
			continue;
		}

		// op: resize
		$srcfile = FS::pathJoin(PREPROS::$config->image->source, $job->src);
		if (!$mounted = PREPROS::mount($srcfile)) throw new Exception("Can't mount image: {$job->src}");
		$localfile = current($mounted);
		if (!is_file($localfile)) throw new Exception("Can't mount image: {$job->src}");

		$width  = (int) ($job->width  ?? 0);
		$height = (int) ($job->height ?? 0);
		$cover  = (bool) ($job->cover ?? false);
		$quality = isset($job->quality) ? (int) $job->quality : null;

		$img = new IMG($localfile);
		if ($width && $height) $img->resize($width, $height, $cover);
		elseif ($width)        $img->resize($width);
		elseif ($height)       $img->resize((int) round($img->width * $height / $img->height), $height);
		// neither: no resize, just re-encode to the target format

		foreach ($job->dests as $dest) $img->save($dest, $quality);
	}

	STD::succeed(['files' => PREPROS::getExportedFiles(), 'colors' => $colors]);

} catch (Throwable $e) {
	STD::error($e->getMessage());
}
