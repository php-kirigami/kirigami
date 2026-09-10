<?php


PREPROS::registerTag('markdown', function ($tag, $attrs, $body) {
	$body = STR::trimIndent($body);
    return MD::toHtml($body);
});


PREPROS::registerTag('img', function ($tag, $attrs, $body) {
    if(empty($attrs['asset'])) return $tag;
	$width = 0;
	$height = 0;
	$cover = false;
	if(isset($attrs['width'])) {
		$width = $attrs['width'] ?? 0;
		unset($attrs['width']);
	}
	if(isset($attrs['height'])) {
		$height = $attrs['height'] ?? 0;
		unset($attrs['height']);
	}
	if(isset($attrs['cover'])) {
		$cover = true;
		unset($attrs['cover']);
	}
	$attrs['src'] = IMG::asset($attrs['asset'], $width, $height, $cover, PREPROS::$file);
	unset($attrs['asset']);
	foreach($attrs as $k => $v) $props[] = $k.'="'.$v.'"';
    return '<img'.(!empty($props) ? ' '.join(' ', $props): '').'>';
});


PREPROS::registerHook('page_info', function($info) {
	// The hook fires with [$file, $pageInfo]; every callback then returns just
	// the (possibly modified) $pageInfo, so a callback registered after this
	// one receives the bare object. Accept either shape.
	if (is_array($info)) {
		[$file, $page] = $info;
	} else {
		$page = $info;
		$file = PREPROS::$file;
	}
	foreach($page as $k => $v) {
		$ext = strtolower(pathinfo($v, PATHINFO_EXTENSION));
		if(in_array($ext, ['yaml', 'yml', 'json', 'md']) ) {
			$isUrl = STR::is_url($v);
			if($isUrl) $filename = $v;
			else $filename = pathinfo(realpath($file), PATHINFO_DIRNAME) . '/' . $v;
			if($isUrl || is_file($filename)) {
				// Remote URLs always go through CURL::getContents — never
				// file_get_contents, which this PHP build can't use for http(s).
				$raw = $isUrl ? CURL::getContents($filename) : file_get_contents($filename);
				if($raw === false) continue;
				$page->{$k} = match ($ext) {
					'yml', 'yaml' => YAML::parse($raw),
					'json'        => json_decode($raw),
					'md'          => MD::toHtml($raw),
					default       => $filename,
				};
			}
		}
	}
	return $page;
});


// LD — capture the page under render, then inject the automatic
// schema.org JSON-LD `<script>` into its `<head>` once the HTML is assembled.
// Registered after the data-loading hook above so `$page` arrives resolved.
PREPROS::registerHook('page_info', function($page) {
	LD::capture($page);
	return $page;
});

PREPROS::registerHook('post_render', function($html) {
	return LD::inject($html);
});