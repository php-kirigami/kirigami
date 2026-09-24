// ---------------------------------------------------------------------------
// Command registry. Lets a plugin add a whole new `kiri <name>` subcommand —
// a package declaring `"kirigami": { "type": "command" }` in its
// package.json (see @kirigami/kirigami's plugin loader) calls
// registerCommand() from its own register(), the same way a plugin adds a
// build hook via on() (hooks.js). @kirigami/cli's kiri.js dispatcher falls
// back to getCommand() when a name doesn't match one of its own built-in
// bin/cmd/*.js files, so a plugin-provided command shows up as a real `kiri`
// subcommand without the CLI package knowing anything about it ahead of
// time. A programmatic caller (an embedder that never touches a terminal)
// can call the same run() directly via listCommands()/getCommand() instead
// of shelling out — that's the point of keeping this registry in the engine
// side (@kirigami/sdk), not in @kirigami/cli.
//
// A command's `run(args, project)` receives the raw CLI-style argv array and
// the loaded Project instance (see @kirigami/kirigami's index.js) — parsing
// those args, printing progress, and deciding the exit code is the command's
// own job, exactly like a built-in bin/cmd/*.js. This registry only routes.
// ---------------------------------------------------------------------------

import { registry } from './registry.js';

const { commands } = registry; // name -> { description, run }


export function registerCommand(name, { description = '', run }) {
	if (typeof run !== 'function') throw `registerCommand("${name}"): "run" must be a function.`;
	if (commands.has(name)) throw `registerCommand("${name}"): a command with this name is already registered.`;
	commands.set(name, { name, description, run });
}


export function getCommand(name) {
	return commands.get(name) || null;
}


export function listCommands() {
	return [...commands.values()];
}


// Mainly for tests / a reload cycle — see hooks.js's reset() for the same
// need on the hook registry.
export function resetCommands(name) {
	if (name) commands.delete(name);
	else commands.clear();
}
