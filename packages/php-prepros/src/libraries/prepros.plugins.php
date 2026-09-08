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
	list($file, $page) = $info;
	foreach($page as $k => $v) {
		$ext = strtolower(pathinfo($v, PATHINFO_EXTENSION));
		if(in_array($ext, ['yaml', 'yml', 'json', 'md']) ) {
			if(preg_match('#^https?:#i', $v)) $filename = $v;
			else $filename = pathinfo(realpath($file), PATHINFO_DIRNAME) . '/' . $v;
			if(is_file($filename) || preg_match('#^https?:#i', $v)) {
				$page->{$k} = match ($ext) {
					'yml', 'yaml' => YAML::parseFile($filename),
					'json'        => json_decode(file_get_contents($filename)),
					'md'          => MD::toHtml(file_get_contents($filename)),
					default       => $filename,
				};
			}
		}
	}
	return $page;
});