// ---------------------------------------------------------------------------
// bin/libs/runscript.js — runs a scripts/<name>.php file inside the Kirigami
// PHP-WASM runtime, mounting any `mount:` globs its kirigami.yaml `scripts:`
// entry declares. Split out of `kiri run`'s command handler (now
// @kirigami/cli's bin/cmd/run.js) on the core-api split: this is what the
// "before-build"/"before-export"/"after-export" triggers actually execute
// (see index.js's runTrigger()), so it has to live in the engine, not the
// CLI package the engine doesn't depend on.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from "path";
import { runenv } from '@kirigami/php-prepros';
import { getConfig } from "../config.js";
import { findFiles } from "../utils.js";

const __root = process.cwd();


export async function runscript(command, argv = []) {
	const config = await getConfig();

	const file = path.join(__root, 'scripts', `${command}.php`);
	if(!fs.existsSync(file)) throw `Command "${command}" not found.`

	const mountpaths = [];
	if(config.scripts?.length) {
		config.scripts.forEach(job => {
			if(job.name == command && job.mount?.length) {
				job.mount.forEach(pattern => findFiles(pattern).forEach(file => mountpaths.push(path.resolve(__root, file))));
			}
		});
	}

	const results = await runenv(file, mountpaths, ...argv);
	if(!results.files) results.files = [];
	return results;
}
