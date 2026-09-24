import * as vscode from "vscode";
import fs from "node:fs";
import path from "node:path";
import { startProject, stopProject } from "./project.js";
import { registerCommands } from "./commands.js";
import { createStatusBar } from "./statusbar.js";
import { watchConfig } from "./configWatcher.js";
import { registerCreateCommand } from "./create.js";
import { registerMcpProvider } from "./mcp.js";
import { createLog } from "./log.js";

/** @param {vscode.ExtensionContext} context */
export async function activate(context) {
	// "kirigami-output": colored like the CLI by syntaxes/kirigami-output.tmLanguage.json.
	const output = vscode.window.createOutputChannel("Kirigami", "kirigami-output");
	context.subscriptions.push(output);
	const log = createLog(output);
	// Available everywhere, including folders that are not Kirigami projects yet.
	registerCreateCommand(context, { output });
	// Registered in every window; it only offers a server for a Kirigami folder.
	registerMcpProvider(context, { output });

	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) return;
	if (!vscode.workspace.isTrusted) return;
	// Activated by "Create Project" outside a Kirigami site: nothing to load.
	if (!fs.existsSync(path.join(folder.uri.fsPath, "kirigami.yaml"))) return;

	const nodePath = vscode.workspace.getConfiguration('kirigami').get('nodePath', 'node');
	log.header("Kirigami for VS Code");
	log.step(`Project   : ${folder.uri.fsPath}`);
	log.step(`Node      : ${nodePath}`);

	try {
		await startProject(context, folder.uri.fsPath, output, nodePath);
	} catch (err) {
		log.error(`Failed to load kirigami.yaml — ${err?.message || err}`);
		vscode.window.showErrorMessage(`Kirigami: failed to load this project — ${err?.message || err}`);
		await stopProject();
		return;
	}

	const statusBar = createStatusBar(context);
	registerCommands(context, { output, statusBar });
	watchConfig(context, { output });
	// Shows the project commands in the palette (see package.json "menus").
	await vscode.commands.executeCommand("setContext", "kirigami.projectLoaded", true);
}

export async function deactivate() { await stopProject(); }
