<?php


PREPROS::registerTag('markdown', function ($tag, $attrs, $body) {
	$body = STR::trimIndent($body);
    return MD::toHtml($body);
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