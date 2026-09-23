import * as vscode from "vscode";
import fs from "node:fs";
import path from "node:path";

// Runs the CLI's own `kiri create` wizard (template list, questions, git,
// npm install) in an integrated terminal instead of re-implementing it. The
// package name is quoted so PowerShell doesn't read `@kirigami` as splatting.
export const CREATE_COMMAND = 'npx --yes "@kirigami/cli" create';

// Shell integration (VS Code 1.93+) reports when the command finishes; without
// it the command is only typed into the terminal.
const SHELL_INTEGRATION_TIMEOUT_MS = 3000;

/**
 * @param {vscode.ExtensionContext} context
 * @param {{ output: vscode.OutputChannel }} deps
 */
export function registerCreateCommand(context, { output }) {
	context.subscriptions.push(vscode.commands.registerCommand("kirigami.create", async () => {
		const picked = await vscode.window.showOpenDialog({
			canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
			openLabel: "Create Kirigami project here",
			title: "Kirigami: choose (or create) the project folder",
			defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
		});
		const folder = picked?.[0]?.fsPath;
		if (!folder) return;

		const terminal = vscode.window.createTerminal({ name: "Kirigami: Create", cwd: folder });
		terminal.show();
		output.appendLine(`create: running "${CREATE_COMMAND}" in ${folder}`);

		const integration = await waitForShellIntegration(terminal);
		if (!integration) {
			terminal.sendText(CREATE_COMMAND);
			return;
		}
		const exitCode = await runAndWait(terminal, integration, CREATE_COMMAND);
		if (exitCode !== 0) {
			output.appendLine(`create: wizard exited with code ${exitCode ?? "unknown"}`);
			return;
		}
		await offerToOpen(findCreatedProject(folder));
	}));
}

function waitForShellIntegration(terminal) {
	if (terminal.shellIntegration) return Promise.resolve(terminal.shellIntegration);
	if (!vscode.window.onDidChangeTerminalShellIntegration) return Promise.resolve(null);
	return new Promise((resolve) => {
		const timer = setTimeout(() => { listener.dispose(); resolve(null); }, SHELL_INTEGRATION_TIMEOUT_MS);
		const listener = vscode.window.onDidChangeTerminalShellIntegration((event) => {
			if (event.terminal !== terminal) return;
			clearTimeout(timer);
			listener.dispose();
			resolve(event.shellIntegration);
		});
	});
}

function runAndWait(terminal, integration, command) {
	return new Promise((resolve) => {
		const execution = integration.executeCommand(command);
		const ended = vscode.window.onDidEndTerminalShellExecution((event) => {
			if (event.execution !== execution) return;
			ended.dispose();
			closed.dispose();
			resolve(event.exitCode);
		});
		const closed = vscode.window.onDidCloseTerminal((closedTerminal) => {
			if (closedTerminal !== terminal) return;
			ended.dispose();
			closed.dispose();
			resolve(undefined);
		});
	});
}

// The wizard asks for a project directory (default "."), so the project is the
// chosen folder or one of its direct subfolders: take the newest kirigami.yaml.
export function findCreatedProject(folder) {
	const candidates = [folder];
	for (const entry of safeReadDir(folder)) {
		if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
			candidates.push(path.join(folder, entry.name));
		}
	}
	return candidates
		.map((dir) => ({ dir, stat: fs.statSync(path.join(dir, "kirigami.yaml"), { throwIfNoEntry: false }) }))
		.filter(({ stat }) => stat?.isFile())
		.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0]?.dir || null;
}

function safeReadDir(dir) {
	try { return fs.readdirSync(dir, { withFileTypes: true }); }
	catch { return []; }
}

async function offerToOpen(projectDir) {
	if (!projectDir) return;
	const uri = vscode.Uri.file(projectDir);
	const current = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (current && path.resolve(current) === path.resolve(projectDir)) {
		// Already open: reload so the extension loads the new kirigami.yaml.
		const choice = await vscode.window.showInformationMessage("Kirigami: project created.", "Reload Window");
		if (choice) await vscode.commands.executeCommand("workbench.action.reloadWindow");
		return;
	}
	const choice = await vscode.window.showInformationMessage(
		`Kirigami: project created in ${projectDir}.`, "Open Folder", "Open in New Window");
	if (choice) await vscode.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow: choice === "Open in New Window" });
}
