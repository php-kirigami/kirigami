<?php
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', 'php://stderr');
ini_set('html_errors', 0);
ini_set('error_reporting', 32767);
error_reporting(E_ALL);

$argv = array_merge(['pxpros.php'], json_decode(getenv('PXPROS_ARGS'), true));

try {
    include(__DIR__ . '/utils.inc.php');
    DATE::setDefaultTimezone();
    
	$files = [];

    if (!isset($argv[1])) STD::error("Invalid argument.");

    if($argv[1] == 'sitemap') {
        if(!$target = realpath($argv[2])) STD::error("Invalid target.");
        if (!$seed = PXPROS::findSeed($target)) STD::error("No project configuration found.");
        $prj = new PXPROS($seed);
        if(!$files[] = $prj->sitemap()) STD::error("Can't produce the sitemap.");
        STD::succeed(['files' => $files]);
    }

    if (!$target = realpath($argv[1])) STD::error("Invalid target.");

    if (is_dir($target)) {
        if (!$seed = PXPROS::findSeed($target)) STD::error("No project configuration found.");
        $prj = new PXPROS($seed);
        foreach (FS::dig($target . '/*.php') as $file) {
            $parent = pathinfo(pathinfo($file, PATHINFO_DIRNAME), PATHINFO_BASENAME);
            if (strpos($parent, '_') === 0) continue;
            if (strpos(pathinfo($file, PATHINFO_FILENAME), '_') !== 0) continue;
            $files[] = $prj->render($file);
        }
    } elseif (preg_match('#^_(.*)\.php$#i', pathinfo($target, PATHINFO_BASENAME), $m)) {
        if (!$seed = PXPROS::findSeed($target)) STD::error("No project configuration found.");
        $pxpros = new PXPROS($seed);
        $files[] = $pxpros->render($target);
    } else {
        throw new Exception("Invalid target.");
    }
    
} catch(Exception $e) {
    STD::error($e->getMessage());
}

STD::succeed(['files' => $files]);