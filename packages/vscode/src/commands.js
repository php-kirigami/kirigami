import * as vscode from "vscode";
import { getProject } from "./project.js";
import { createLog } from "./log.js";

/**
 * @param {vscode.ExtensionContext} context
 * @param {{ output: vscode.OutputChannel, statusBar: ReturnType<typeof import("./statusbar.js").createStatusBar> }} deps
 */
export function registerCommands(context, { output, statusBar }) {
	// Same layout as the kiri CLI's build/export/run/serve commands.
	const log = createLog(output);

	context.subscriptions.push(
		vscode.commands.registerCommand("kirigami.build", () => runBuildLike("build")),
		vscode.commands.registerCommand("kirigami.export", () => runBuildLike("export")),
		vscode.commands.registerCommand("kirigami.validate", validate),
		vscode.commands.registerCommand("kirigami.run", run),
		vscode.commands.registerCommand("kirigami.toggleServer", toggleServer),
	);

	async function runBuildLike(kind) {
		const project = await getProject();
		const title = kind === "build" ? "Build" : "Export";
		output.show(true);
		log.header(`${title} Project`);
		log.section("Tasks");
		try {
			const result = kind === "build" ? await project.build() : await project.export();
			log.buildResult(result);
			log.line();
			if (result.success) {
				if (kind === "export") log.step(`Output    : ${result.dist}`);
				log.success(`${title} finished!`);
				vscode.window.showInformationMessage(`Kirigami: ${kind} succeeded.`);
			} else {
				log.error(`${title} failed.`);
				vscode.window.showErrorMessage(`Kirigami: ${kind} failed — see the Kirigami output channel.`);
			}
		} catch (err) {
			log.error(`${title} failed — ${err?.stack || err}`);
			vscode.window.showErrorMessage(`Kirigami: ${kind} failed — ${err?.message || err}`);
		}
	}

	async function validate() {
		const project = await getProject();
		try {
			await project.validate();
			log.success("kirigami.yaml is valid");
			vscode.window.showInformationMessage("Kirigami: kirigami.yaml is valid.");
		} catch (err) {
			log.error(`kirigami.yaml is invalid — ${err?.message || err}`);
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
		log.header("Run Script");
		try {
			const result = await project.run(pick.label);
			log.result(`SCRIPT: ${pick.label}`, { ...result, success: result?.success === true });
			if (result?.success === true) {
				vscode.window.showInformationMessage(`Kirigami: ${pick.label} finished.`);
			} else {
				vscode.window.showErrorMessage(`Kirigami: ${pick.label} failed — see the Kirigami output channel.`);
			}
		} catch (err) {
			log.error(`${pick.label} failed — ${err?.stack || err}`);
			vscode.window.showErrorMessage(`Kirigami: ${pick.label} failed — ${err?.message || err}`);
		}
	}

	async function toggleServer() {
		if (statusBar.getServer()) {
			await stopServer();
		} else {
			try { await startServer(); }
			catch (error) {
				statusBar.setState('error', String(error?.message || error).slice(0, 200));
				log.error(/Initial build failed/.test(String(error?.message))
					? "Dev server not started: the initial build failed (see above)."
					: `Dev server failed — ${error?.stack || error}`);
				vscode.window.showErrorMessage('Kirigami: preview failed — see the Kirigami output channel.');
			}
		}
	}

	async function startServer() {
		const project = await getProject();
		output.show(true);
		log.header("Dev-mode with hot-reload");
		const server = await project.serve({
			port: vscode.workspace.getConfiguration("kirigami").get("previewPort", 4321),
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
				if (event.initial) {
					// The whole initial build, as `kiri build` prints it.
					log.section("Tasks");
					// Its `error` only repeats the task results as JSON.
					log.buildResult({ ...event, error: event.results?.length ? undefined : event.error });
					log.line();
					if (event.success) log.success("Initial build finished!");
					else log.error("Initial build failed.");
				} else if (event.success) {
					log.success(`${event.rule} rebuilt`);
					log.line();
				} else {
					log.error(`${event.rule} failed`);
					log.taskError(event);
					log.line();
				}
			},
		});
		statusBar.setServer(server);
		log.line();
		log.info(`Serving  : ${server.url} (hot-reload on)`);
		log.info("Waiting for file change...");
		log.line();

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
		log.info("Dev server stopped");
	}
}
