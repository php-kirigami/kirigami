<?php

include(__DIR__ . '/utils.inc.php');


try {

    if (!isset($argv[1])) STD::error("Invalid PHP file.");
    if (!is_file($argv[1])) STD::error("PHP file not found.");

    require_once($argv[1]);

} catch(Exception $e) {
    STD::error($e->getMessage());
}

STD::succeed(['files' => PREPROS::getExportedFiles()]);