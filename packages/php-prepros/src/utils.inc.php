<?php

const BR = '<br>';
const RN = "\r\n";
const S = '/';
const R = "\r";
const N = "\n";


function _print_r(mixed $obj, bool $ret = false) {
    if($ret) return '<pre>' . print_r($obj, $ret) . '</pre>';
    echo '<pre>' . print_r($obj, true) . '</pre>';
}


spl_autoload_register(function ($class) {
    static $catalog = [

        // Out of the box
        'ARR'             => 'arr.class.php',    
        'CACHE'           => 'cache.class.php',
        'CURL'            => 'curl.class.php',
		'FS'              => 'fs.class.php',
        'HTML'            => 'html.class.php',
        'IMG'             => 'img.class.php',
        'MD'              => 'md.class.php',
        'NORM'            => 'norm.class.php',
        'OBF'             => 'obf.class.php',
		'PREPROS'         => 'prepros.class.php',
        'SCHEMA'          => 'schema.class.php',
		'SCRAPER'         => 'scraper.class.php',
        'STD'             => 'std.class.php',
        'STR'             => 'str.class.php',
        'YAML'            => 'yaml.class.php',

        // Fallbacks
        'Normalizer'      => 'normalizer.class.php'
    ];
    if (isset($catalog[$class])) require_once(__DIR__ . '/libraries/' . $catalog[$class]);
}, true, true);



$argv = array_merge(['prepros.php'], json_decode(getenv('PREPROS_ARGS'), true));
$config = json_decode(getenv('PREPROS_CONFIG'));
date_default_timezone_set($config->timezone);
chdir('/project');

require_once(__DIR__ . '/libraries/aliases.inc.php');

PREPROS::loadConfig($config);

// Bootstrap is done: config loaded, `includes` pulled in, aliases available.
// Fires once per process, before any page renders, for every entrypoint
// (prepros.php, runenv.php, imagebatch.php). A plugin registered from an
// `includes` file (or prepros.plugins.php) can hook here to pull in extra
// PHP files or wire itself up.
PREPROS::runHook('boot', $config);
