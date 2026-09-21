import * as vscode from "vscode";
import { getProject } from "./project.js";

/**
 * @param {vscode.ExtensionContext} context
 * @param {{ output: vscode.OutputChannel, statusBar: ReturnType<typeof import("./statusbar.js").createStatusBar> }} deps
 */
export function registerCommands(context, { output, statusBar }) {
	context.subscriptions.push(
		vscode.commands.registerCommand("kirigami.build", () => runBuildLike("build")),
		vscode.commands.registerCommand("kirigami.export", () => runBuildLike("export")),
		vscode.commands.registerCommand("kirigami.validate", validate),
		vscode.commands.registerCommand("kirigami.run", run),
		vscode.commands.registerCommand("kirigami.toggleServer", toggleServer),
	);

	async function runBuildLike(kind) {
		const project = await getProject();
		output.show(true);
		output.appendLine(`Kirigami: ${kind}…`);
		try {
			const result = kind === "build" ? await project.build() : await project.export();
			if (result.success) {
				vscode.window.showInformationMessage(`Kirigami: ${kind} succeeded.`);
				output.appendLine(`${kind}: success.`);
			} else {
				vscode.window.showErrorMessage(`Kirigami: ${kind} failed — see the Kirigami output channel.`);
				output.appendLine(`${kind}: failed.\n${JSON.stringify(result.results, null, 2)}`);
			}
		} catch (err) {
			vscode.window.showErrorMessage(`Kirigami: ${kind} failed — ${err?.message || err}`);
			output.appendLine(`${kind}: threw — ${err?.stack || err}`);
		}
	}

	async function validate() {
		const project = await getProject();
		try {
			await project.validate();
			vscode.window.showInformationMessage("Kirigami: kirigami.yaml is valid.");
		} catch (err) {
			vscode.window.showErrorMessage(`Kirigami: kirigami.yaml is invalid — ${err?.message || err}`);
		}
	}

	async function run() {
		const project = await getProject();
		const scripts = await project.listScripts();
		if (!scripts.length) {
			vscode.window.showInformationMessage("Kirigami: no scripts/ found in this project.");
			return;
		}
		const pick = await vscode.window.showQuickPick(
			scripts.map((s) => ({ label: s.name, description: s.trigger ? `trigger: ${s.trigger}` : undefined })),
			{ placeHolder: "Choose a script to run" },
		);
		if (!pick) return;
		output.show(true);
		output.appendLine(`Kirigami: run ${pick.label}…`);
		try {
			const result = await project.run(pick.label);
			if (result?.success === true) {
				vscode.window.showInformationMessage(`Kirigami: ${pick.label} finished.`);
			} else {
				vscode.window.showErrorMessage(`Kirigami: ${pick.label} failed — see the Kirigami output channel.`);
				output.appendLine(`run ${pick.label}: failed.\n${JSON.stringify(result, null, 2)}`);
			}
		} catch (err) {
			vscode.window.showErrorMessage(`Kirigami: ${pick.label} failed — ${err?.message || err}`);
			output.appendLine(`run ${pick.label}: threw — ${err?.stack || err}`);
		}
	}

	async function toggleServer() {
		if (statusBar.getServer()) {
			await stopServer();
		} else {
			try { await startServer(); }
			catch (error) {
				statusBar.setState('error', String(error?.message || error).slice(0, 200));
				output.appendLine(`serve: failed — ${error?.stack || error}`);
				vscode.window.showErrorMessage('Kirigami: preview failed — see the Kirigami output channel.');
			}
		}
	}

	async function startServer() {
		const project = await getProject();
		const server = await project.serve({
			port: 4321,
			onBuildResult: (event) => {
				if (event.status === "start") {
					statusBar.setState("building");
					return;
				}
				if (event.success) {
					if (!event.initial) statusBar.setState("running");
				} else {
					statusBar.setState("error", String(event.error).slice(0, 200));
				}
				output.appendLine(`[${event.type}] ${event.rule}: ${event.success ? "ok" : "failed"}`);
				if (!event.success) output.appendLine(String(event.error));
			},
		});
		statusBar.setServer(server);

		const choice = await vscode.window.showQuickPick(
			["Open in VS Code", "Open in external browser"],
			{ placeHolder: `Serving ${server.url}` },
		);
		if (choice === "Open in VS Code") {
			await vscode.commands.executeCommand("simpleBrowser.show", server.url);
		} else if (choice === "Open in external browser") {
			await vscode.env.openExternal(vscode.Uri.parse(server.url));
		}
	}

	async function stopServer() {
		const server = statusBar.getServer();
		if (server) await server.close();
		statusBar.setServer(null);
	}
}
