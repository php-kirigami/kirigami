import * as vscode from "vscode";
import fs from "node:fs";
import path from "node:path";

// Registers the project's @kirigami/mcp stdio server with VS Code (1.101+), so
// agents using VS Code's MCP registry (e.g. Copilot agent mode) get the
// kirigami_* tools without any configuration. The server runs in the same
// external Node as the worker, from the staged runtime, with the workspace
// folder as its working directory (the MCP server loads kirigami.yaml from
// there). Older VS Code versions lack the API: nothing is registered.
export const MCP_PROVIDER_ID = "kirigami";

/**
 * @param {vscode.ExtensionContext} context
 * @param {{ output: vscode.OutputChannel }} deps
 */
export function registerMcpProvider(context, { output }) {
	if (typeof vscode.lm?.registerMcpServerDefinitionProvider !== "function") return false;

	const changed = new vscode.EventEmitter();
	context.subscriptions.push(changed);
	context.subscriptions.push(vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, {
		onDidChangeMcpServerDefinitions: changed.event,
		provideMcpServerDefinitions: () => {
			const definition = mcpServerDefinition(context);
			return definition ? [definition] : [];
		},
		resolveMcpServerDefinition: (server) => server,
	}));

	// A kirigami.yaml created or deleted in the folder (e.g. by Create Project)
	// changes whether there is a server to offer.
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (folder) {
		const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(folder, "kirigami.yaml"), false, true, false);
		context.subscriptions.push(watcher, watcher.onDidCreate(() => changed.fire()), watcher.onDidDelete(() => changed.fire()));
	}
	output.appendLine("Kirigami: MCP server provider registered.");
	return true;
}

function mcpServerDefinition(context) {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder || !vscode.workspace.isTrusted) return null;
	if (!fs.existsSync(path.join(folder.uri.fsPath, "kirigami.yaml"))) return null;

	const nodePath = vscode.workspace.getConfiguration("kirigami").get("nodePath", "node");
	const entry = path.join(context.extensionPath, "dist/runtime/node_modules/@kirigami/mcp/bin/kiri-mcp.js");
	const version = readVersion(path.join(context.extensionPath, "dist/runtime/node_modules/@kirigami/mcp/package.json"));
	const definition = new vscode.McpStdioServerDefinition("Kirigami", nodePath, [entry], {}, version);
	definition.cwd = folder.uri;
	return definition;
}

function readVersion(manifest) {
	try { return JSON.parse(fs.readFileSync(manifest, "utf8")).version; }
	catch { return undefined; }
}
