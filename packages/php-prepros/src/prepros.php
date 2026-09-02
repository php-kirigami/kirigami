<?php

include(__DIR__ . '/utils.inc.php');

try {
    if (!isset($argv[1])) STD::error("Invalid argument.");
    
    if($argv[1] == 'sitemap') {
        if(!PREPROS::sitemap()) STD::error("Can't produce the sitemap.");
        STD::succeed(['files' => PREPROS::getExportedFiles()]);
    }
    elseif (!$target = realpath($argv[1])) STD::error("Invalid target.");
    else if (is_dir($target)) {
        $prj = new PREPROS($config);
        foreach (FS::dig($target . '/*.php', true) as $file) {
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
    STD::error(['message' => $e->getMessage()]);
}


STD::succeed();