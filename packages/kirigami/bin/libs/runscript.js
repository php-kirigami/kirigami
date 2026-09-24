// ---------------------------------------------------------------------------
// bin/libs/runscript.js — runs a PHP script inside the Kirigami PHP-WASM
// runtime, mounting any `mount:` globs its metadata declares. The script is
// either a project's own scripts/<name>.php (with mount/trigger metadata from
// its kirigami.yaml `scripts:` entry) or, if no local file by that name
// exists, one a plugin registered via the SDK's `scripts:register` hook.
// Split out of `kiri run`'s command handler (now @kirigami/cli's
// bin/cmd/run.js) on the core-api split: this is what the
// "before-build"/"before-export"/"after-export" triggers actually execute
// (see index.js's runTrigger()), so it has to live in the engine, not the
// CLI package the engine doesn't depend on.
// ---------------------------------------------------------------------------

import fs from 'fs';
import path from "path";
import { runenv, runPluginScript } from '@kirigami/php-prepros';
import { run as runHook, HOOKS } from '@kirigami/sdk';
import { getConfig } from "../config.js";
import { findFiles } from "../utils.js";
import { activePluginDirs } from "./plugins.js";

const __root = process.cwd();

// Scripts plugins contribute via the `scripts:register` hook — collected
// once per reload(), since a plugin's register() call (where it calls
// `on(HOOKS.SCRIPTS_REGISTER, ...)`) always runs before this is first read.
let _pluginScripts;
export function clearPluginScriptsCache() {
	_pluginScripts = undefined;
}
export async function getPluginScripts() {
	if (_pluginScripts) return _pluginScripts;
	const config = await getConfig();
	_pluginScripts = (await runHook(HOOKS.SCRIPTS_REGISTER, { config })).filter(Boolean);
	return _pluginScripts;
}


const inside = (root, target) => {
	const relative = path.relative(root, target);
	return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
};


// A plugin script inside the project (a regular npm install) runs like a
// project file. One outside it (npm link, workspace) must belong to an active
// plugin's package, and is contained by that package instead.
async function runRegistered(file, mountpaths, argv) {
	const real = fs.realpathSync(file);
	if (inside(fs.realpathSync(__root), real)) return runenv(file, mountpaths, ...argv);
	const pluginDir = activePluginDirs().find(dir => inside(fs.realpathSync(dir), real));
	if (!pluginDir) throw `Plugin script "${file}" is outside the project and every active plugin package.`;
	return runPluginScript(real, pluginDir, mountpaths, ...argv);
}


export async function runscript(command, argv = []) {
	const config = await getConfig();

	// A project's own scripts/<name>.php always takes precedence over a
	// plugin registering the same name.
	const localFile = path.join(__root, 'scripts', `${command}.php`);
	const registered = fs.existsSync(localFile) ? null : (await getPluginScripts()).find(s => s.name === command);
	const file = registered ? registered.file : localFile;
	if(!fs.existsSync(file)) throw `Command "${command}" not found.`

	const mountpaths = [];
	if(registered?.mount?.length) {
		registered.mount.forEach(pattern => findFiles(pattern).forEach(file => mountpaths.push(path.resolve(__root, file))));
	}
	if(config.scripts?.length) {
		config.scripts.forEach(job => {
			if(job.name == command && job.mount?.length) {
				job.mount.forEach(pattern => findFiles(pattern).forEach(file => mountpaths.push(path.resolve(__root, file))));
			}
		});
	}

	const results = registered
		? await runRegistered(file, mountpaths, argv)
		: await runenv(file, mountpaths, ...argv);
	if(!results.files) results.files = [];
	return results;
}
