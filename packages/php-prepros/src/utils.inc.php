<?php

const BR = '<br>';
const RN = "\r\n";
const S = '/';
const R = "\r";
const N = "\n";


function _print_r(mixed $obj) {
    echo '<pre>' . print_r($obj, true) . '</pre>';
}


spl_autoload_register(function ($class) {
    static $catalog = [
        'CACHE'           => 'cache.class.php',
		'FS'              => 'fs.class.php',
        'HTML'            => 'html.class.php',
        'IMG'             => 'img.class.php',
        'MD'              => 'md.class.php',
        'OBF'             => 'obf.class.php',
		'PREPROS'         => 'prepros.class.php',
		'STD'             => 'std.class.php',
        'STR'             => 'str.class.php',
        'YAML'            => 'yaml.class.php',
    ];
    if (isset($catalog[$class])) require_once(__DIR__ . '/libraries/' . $catalog[$class]);
}, true, true);