<?php
ini_set('log_errors', 1);
ini_set('html_errors', 0);
ini_set('display_errors', 1);
ini_set('error_reporting', 32767);
ini_set('error_log', 'php://stderr');
error_reporting(E_ALL);


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
        'ARR'             => 'arr.class.php',    
        'CACHE'           => 'cache.class.php',
		'FS'              => 'fs.class.php',
        'HTML'            => 'html.class.php',
        'IMG'             => 'img.class.php',
        'MD'              => 'md.class.php',
        'OBF'             => 'obf.class.php',
		'PREPROS'         => 'prepros.class.php',
		'SCRAPER'         => 'scraper.class.php',
        'STD'             => 'std.class.php',
        'STR'             => 'str.class.php',
        'YAML'            => 'yaml.class.php',
    ];
    if (isset($catalog[$class])) require_once(__DIR__ . '/libraries/' . $catalog[$class]);
}, true, true);


$argv = array_merge(['prepros.php'], json_decode(getenv('PREPROS_ARGS'), true));
$config = json_decode(getenv('PREPROS_CONFIG'));
date_default_timezone_set($config->timezone);


PREPROS::loadConfig($config);