<?php

const BR = '<br>';
const RN = "\r\n";
const S = '/';
const R = "\r";
const N = "\n";


spl_autoload_register(function ($class) {
    static $catalog = [
        'CACHE'           => 'cache.class.php',
        'DATE'            => 'date.class.php',
		'FS'              => 'fs.class.php',
        'IMG'             => 'img.class.php',
        'OBF'             => 'obf.class.php',
		'PXPROS'          => 'pxpros.class.php',
		'STD'             => 'std.class.php',
        'STR'             => 'str.class.php',
        'SYS'             => 'sys.class.php',
        'YAML'            => 'yaml.class.php',
    ];
    if (isset($catalog[$class])) require_once(__DIR__ . '/libraries/' . $catalog[$class]);
}, true, true);