import * as vscode from "vscode";
import { getProject } from "./project.js";

/**
 * Watches kirigami.yaml at the workspace root and calls Project.reload() on
 * change, so the extension's in-memory Project stays in sync with the file
 * on disk. Scoped to kirigami.yaml only for v1 — node_modules plugin-install
 * watching is a separate, not-yet-scoped concern.
 *
 * @param {vscode.ExtensionContext} context
 * @param {{ output: vscode.OutputChannel }} deps
 */
export function watchConfig(context, { output }) {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) return;

	const watcher = vscode.workspace.createFileSystemWatcher(
		new vscode.RelativePattern(folder, "kirigami.yaml"),
	);
	context.subscriptions.push(watcher);

	const onChange = async () => {
		try {
			const project = await getProject();
			await project.reload();
			output.appendLine("kirigami.yaml reloaded.");
		} catch (err) {
			output.appendLine(`kirigami.yaml reload failed: ${err?.message || err}`);
		}
	};

	context.subscriptions.push(watcher.onDidChange(onChange));
	context.subscriptions.push(watcher.onDidCreate(onChange));
}
