import * as vscode from "vscode";
import { getProject } from "./project.js";
import { registerCommands } from "./commands.js";
import { createStatusBar } from "./statusbar.js";
import { watchConfig } from "./configWatcher.js";

/** @param {vscode.ExtensionContext} context */
export async function activate(context) {
	const output = vscode.window.createOutputChannel("Kirigami");
	context.subscriptions.push(output);

	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) return;

	// Project (@kirigami/kirigami) resolves kirigami.yaml/plugins/scripts off
	// process.cwd() only — no path-parameter alternative exists (see its own
	// docblock). This mutates the whole shared extension host process's cwd,
	// once, at activation. Single workspace folder only for v1 — multi-root
	// isn't supported by Project itself yet.
	process.chdir(folder.uri.fsPath);
	output.appendLine(`Kirigami: activated for ${folder.uri.fsPath} (node ${process.version})`);

	try {
		await getProject();
	} catch (err) {
		output.appendLine(`Kirigami: failed to load kirigami.yaml — ${err?.message || err}`);
		vscode.window.showErrorMessage(`Kirigami: failed to load this project — ${err?.message || err}`);
		return;
	}

	const statusBar = createStatusBar(context);
	registerCommands(context, { output, statusBar });
	watchConfig(context, { output });
}

export function deactivate() {}
