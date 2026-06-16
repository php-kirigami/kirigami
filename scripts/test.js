import fs from 'fs';
import path from "path";
import { fileURLToPath } from 'url';

import { PHP, loadPHPRuntime } from '@php-wasm/universal';
import { getPHPLoaderModule } from '@kirigami/php-wasm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __project = process.cwd();

const runtime = await loadPHPRuntime(await getPHPLoaderModule());
const php = new PHP(runtime);


php.mkdir('/project');
php.writeFile('/project/phpinfo.php', '<?php phpinfo();');
php.setSpawnHandler((command, args, options) => {
	return spawn(command, args, options);
});
const output = await php.runStream({
	scriptPath: '/project/phpinfo.php',
	// env: { PXPROS_ARGS: JSON.stringify(args) }
});
const stdout = await output.stdoutText;
const stderr = await output.stderrText;

console.log(stdout);