import * as vscode from "vscode";
import path from "node:path";
import { startWorker } from "./project.js";

// "Kirigami: Create Project…" — a native wizard (quick picks and input boxes)
// over @kirigami/kirigami/create, the same scaffolding `kiri create` and the
// MCP server use. Core runs in a short-lived external-Node worker (like the
// project engine, see project.js), with the chosen folder as its cwd.

const TITLE = "Kirigami: Create Project";

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

		const nodePath = vscode.workspace.getConfiguration("kirigami").get("nodePath", "node");
		const worker = startWorker(context, folder, output, nodePath);
		try {
			const target = await runWizard(worker, folder, output);
			if (target) await offerToOpen(target);
		} catch (err) {
			output.appendLine(`create: ${err?.message || err}`);
			vscode.window.showErrorMessage(`Kirigami: project creation failed — ${firstLine(err)}`);
		} finally {
			await worker.dispose();
		}
	}));
}

// Asks every question, then scaffolds. Resolves the project directory, or
// null when the user cancels at any step.
async function runWizard(worker, folder, output) {
	const templates = await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Kirigami: loading templates…" },
		() => worker.call("listTemplates"));
	if (!templates.length) throw new Error("No templates found — the GitHub API may be unreachable.");

	const template = await vscode.window.showQuickPick(
		templates.map((t) => ({ label: t.template, detail: t.description || undefined, template: t })),
		{ title: TITLE, placeHolder: "Which template?", matchOnDetail: true, ignoreFocusOut: true });
	if (!template) return null;

	const dir = await input({ prompt: "Project directory, relative to the chosen folder", value: ".",
		validateInput: (v) => v.trim() ? undefined : "Use \".\" for the chosen folder itself." });
	if (dir === undefined) return null;
	const target = path.resolve(folder, dir.trim());

	// Extraction never overwrites, so a non-empty target is fine: say so.
	const existing = await worker.call("inspectTarget", [target]);
	if (existing.entries.length) {
		const go = await vscode.window.showWarningMessage(
			`${target} already holds ${existing.entries.length} item(s). They are kept as-is; only missing files are added${existing.hasPackageJson ? " and package.json is merged" : ""}.`,
			{ modal: true }, "Continue");
		if (go !== "Continue") return null;
	}

	const git = await worker.call("gitUserConfig");
	const meta = {};
	for (const [key, prompt, value, placeHolder] of [
		["name", "Project name", path.basename(target)],
		["description", "Description", ""],
		["author", "Author", git.name],
		["email", "Author email", git.email],
		["baseurl", "Site base URL", "", "https://user.github.io/site"],
		["repo", "Git repository URL", "", "Empty: derived from a *.github.io base URL"],
	]) {
		const answer = await input({ prompt, value, placeHolder });
		if (answer === undefined) return null;
		meta[key] = answer.trim();
	}

	const gitCheck = await worker.call("canInitGit", [target]);
	const options = [
		...(gitCheck.ok ? [{ label: "Initialise a git repository", id: "git", picked: true }] : []),
		{ label: "Run npm install", id: "install", picked: true },
	];
	const chosen = await vscode.window.showQuickPick(options,
		{ title: TITLE, placeHolder: "Options (Enter to confirm)", canPickMany: true, ignoreFocusOut: true });
	if (!chosen) return null;
	const want = new Set(chosen.map((o) => o.id));

	return vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: `Kirigami: creating project from "${template.label}"` },
		async (progress) => {
			output.appendLine(`create: template "${template.label}" into ${target}`);
			const result = await worker.call("createProject", [{ template: template.template, target, meta, git: want.has("git") }]);
			if (!result.success) throw new Error(result.error);
			output.appendLine(`create: ${result.written} file(s) written, ${result.skipped} kept, package.json ${result.packageJson}`);
			if (result.git.error) output.appendLine(`create: git — ${result.git.error}`);

			if (want.has("install")) {
				progress.report({ message: "npm install…" });
				output.show(true);
				const install = await worker.call("installDependencies", [target]);
				if (!install.success) {
					vscode.window.showWarningMessage(`Kirigami: project created, but npm install failed — ${install.error}. See the Kirigami output.`);
				}
			}
			return result.target;
		});
}

function input({ prompt, value, placeHolder, validateInput }) {
	return vscode.window.showInputBox({ title: TITLE, prompt, value, placeHolder, validateInput, ignoreFocusOut: true });
}

function firstLine(err) {
	return String(err?.message || err).split("\n")[0];
}

async function offerToOpen(projectDir) {
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
