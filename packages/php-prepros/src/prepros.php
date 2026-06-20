<?php

ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stderr');
ini_set('html_errors', 0);
ini_set('error_reporting', 32767);
error_reporting(E_ALL);


$argv = array_merge(['prepros.php'], json_decode(getenv('PREPROS_ARGS'), true));
$config = json_decode(getenv('PREPROS_CONFIG'));


try {

    date_default_timezone_set($config->timezone);
    if (!isset($argv[1])) STD::error("Invalid argument.");
    include(__DIR__ . '/utils.inc.php');
    PREPROS::loadConfig($config);
    if($argv[1] == 'sitemap') {
        if(!PREPROS::sitemap()) STD::error("Can't produce the sitemap.");
        STD::succeed(['files' => PREPROS::getExportedFiles()]);
    }
    elseif (!$target = realpath($argv[1])) STD::error("Invalid target.");
    else if (is_dir($target)) {
        $prj = new PREPROS($config);
        foreach (FS::dig($target . '/*.php') as $file) {
            $parent = pathinfo(pathinfo($file, PATHINFO_DIRNAME), PATHINFO_BASENAME);
            if (strpos($parent, '_') === 0) continue;
            if (strpos(pathinfo($file, PATHINFO_FILENAME), '_') !== 0) continue;
            PREPROS::render($file);
        }
    } elseif (preg_match('#^_(.*)\.php$#i', pathinfo($target, PATHINFO_BASENAME), $m)) {
        PREPROS::render($target);
    } else {
        throw new Exception("Invalid target.");
    }

} catch(Exception $e) {
    STD::error($e->getMessage());
}


STD::succeed(['files' => PREPROS::getExportedFiles()]);