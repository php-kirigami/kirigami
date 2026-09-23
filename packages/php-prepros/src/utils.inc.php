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
        'LD'              => 'ld.class.php',
        'MD'              => 'md.class.php',
        'META'            => 'meta.class.php',
        'OBF'             => 'obf.class.php',
		'PREPROS'         => 'prepros.class.php',
        'SCHEMA'          => 'schema.class.php',
		'SCRAPER'         => 'scraper.class.php',
        'STD'             => 'std.class.php',
        'STR'             => 'str.class.php',
        'YAML'            => 'yaml.class.php',

        // Fallbacks
        'MD_LEGACY'       => 'md-legacy.class.php',
        'NORMALIZER_LEGACY' => 'normalizer-legacy.class.php',
        'SCHEMA_LEGACY'   => 'schema-legacy.class.php',
        'YAML_LEGACY'     => 'yaml-legacy.class.php'
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

// Symmetric `shutdown` hook, fired via register_shutdown_function rather
// than auto_append_file: every entrypoint ends in STD::succeed()/STD::error(),
// both of which exit() — and PHP skips auto_append_file whenever the script
// terminates through exit()/die(). A shutdown function has no such gap.
register_shutdown_function(function () {
    PREPROS::runHook('shutdown');
});
