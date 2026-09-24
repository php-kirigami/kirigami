import * as vscode from "vscode";

const ICONS = {
	idle: "$(circle-outline)",
	running: "$(radio-tower)",
	building: "$(sync~spin)",
	error: "$(error)",
};

/** @param {vscode.ExtensionContext} context */
export function createStatusBar(context) {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	item.command = "kirigami.toggleServer";
	context.subscriptions.push(item);

	/** @type {{ url: string, close(): Promise<void> } | null} */
	let server = null;

	function setState(state, detail) {
		item.text = `${ICONS[state]} Kirigami`;
		item.backgroundColor = state === "error"
			? new vscode.ThemeColor("statusBarItem.errorBackground")
			: undefined;
		item.tooltip = detail
			|| (server ? `Serving ${server.url} — click to stop` : "Click to start the Kirigami dev server");
		item.show();
	}

	setState("idle");

	return {
		item,
		setState,
		getServer: () => server,
		setServer: (s) => {
			server = s;
			setState(s ? "running" : "idle");
		},
	};
}
