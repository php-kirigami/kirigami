<?php

// Framework bootstrap (autoloader, $argv/$config, aliases, `boot` hook) is
// loaded via php.ini's auto_prepend_file, not an explicit include here.

try {

    if (!isset($argv[1])) STD::error("Invalid PHP file.");
    if (!is_file($argv[1])) STD::error("PHP file not found.");

    require_once($argv[1]);

} catch(Throwable $e) {
    STD::error([
        'error' => $e->getMessage(),
        'where' => $e->getFile() . ':' . $e->getLine(),
    ]);
}

STD::succeed(['files' => PREPROS::getExportedFiles()]);