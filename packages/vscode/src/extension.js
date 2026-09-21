import * as vscode from "vscode";
import { startProject, stopProject } from "./project.js";
import { registerCommands } from "./commands.js";
import { createStatusBar } from "./statusbar.js";
import { watchConfig } from "./configWatcher.js";

/** @param {vscode.ExtensionContext} context */
export async function activate(context) {
	const output = vscode.window.createOutputChannel("Kirigami");
	context.subscriptions.push(output);

	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) return;
	if (!vscode.workspace.isTrusted) return;

	const nodePath = vscode.workspace.getConfiguration('kirigami').get('nodePath', 'node');
	output.appendLine(`Kirigami: activated for ${folder.uri.fsPath} (node ${process.version})`);

	try {
		await startProject(context, folder.uri.fsPath, output, nodePath);
	} catch (err) {
		output.appendLine(`Kirigami: failed to load kirigami.yaml — ${err?.message || err}`);
		vscode.window.showErrorMessage(`Kirigami: failed to load this project — ${err?.message || err}`);
		await stopProject();
		return;
	}

	const statusBar = createStatusBar(context);
	registerCommands(context, { output, statusBar });
	watchConfig(context, { output });
}

export async function deactivate() { await stopProject(); }
