const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');

// Loads the compiled extension against a stub vscode API. The wizard itself is
// the CLI's `kiri create`; here the terminal is simulated, and the test checks
// what the extension sends to it and what it does once the wizard finishes.
function loadExtension(vscode) {
	const originalLoad = Module._load;
	const bundle = path.join(__dirname, '../dist/extension.js');
	delete require.cache[bundle];
	try {
		Module._load = function(name, ...args) { return name === 'vscode' ? vscode : originalLoad.call(this, name, ...args); };
		return require(bundle);
	} finally { Module._load = originalLoad; }
}

function stubVscode({ workspace, terminal, picks }) {
	const disposable = { dispose() {} };
	const commands = new Map();
	const executed = [];
	const errors = [];
	const listeners = { integration: [], end: [], close: [] };
	const on = (list) => (fn) => { list.push(fn); return { dispose() { list.splice(list.indexOf(fn), 1); } }; };
	const vscode = {
		workspace: {
			isTrusted: true, workspaceFolders: workspace ? [{ uri: { fsPath: workspace } }] : undefined,
			getConfiguration: () => ({ get: () => process.execPath }),
		},
		window: {
			createOutputChannel: () => ({ ...disposable, append() {}, appendLine() {}, show() {} }),
			showErrorMessage: (s) => errors.push(s),
			showInformationMessage: async (message, ...items) => picks.info(message, items),
			showOpenDialog: async () => picks.folder && [{ fsPath: picks.folder }],
			createTerminal: (options) => { terminal.options = options; return terminal; },
			onDidChangeTerminalShellIntegration: terminal.supportsIntegration ? on(listeners.integration) : undefined,
			onDidEndTerminalShellExecution: on(listeners.end),
			onDidCloseTerminal: on(listeners.close),
		},
		commands: {
			registerCommand(name, fn) { commands.set(name, fn); return disposable; },
			executeCommand: async (...args) => { executed.push(args); },
		},
		Uri: { file: (fsPath) => ({ fsPath }) },
	};
	return { vscode, commands, executed, errors, listeners };
}

function tempDir(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-create-ext-'));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

test('outside a Kirigami project only Create is registered, and it runs the CLI wizard then offers the new project', async (t) => {
	const workspace = tempDir(t);
	const target = tempDir(t);
	const sent = [];
	const terminal = {
		supportsIntegration: true, shown: false,
		show() { this.shown = true; },
		sendText: (text) => sent.push(text),
	};
	const offered = [];
	const stub = stubVscode({
		workspace, terminal,
		picks: { folder: target, info: (message, items) => { offered.push({ message, items }); return 'Open in New Window'; } },
	});
	const extension = loadExtension(stub.vscode);
	await extension.activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });

	// No kirigami.yaml in the workspace: no project commands, no worker, no error.
	assert.deepEqual([...stub.commands.keys()], ['kirigami.create']);
	assert.deepEqual(stub.errors, []);
	assert.ok(!stub.executed.some(([name]) => name === 'setContext'));

	const execution = {};
	const running = stub.commands.get('kirigami.create')();
	// The terminal reports shell integration, then the wizard runs and creates
	// the project in a subfolder, then the command ends successfully.
	await new Promise((resolve) => setImmediate(resolve));
	const executed = [];
	const integration = { executeCommand: (command) => { executed.push(command); return execution; } };
	stub.listeners.integration.forEach((fn) => fn({ terminal, shellIntegration: integration }));
	await new Promise((resolve) => setImmediate(resolve));
	fs.mkdirSync(path.join(target, 'my-site'));
	fs.writeFileSync(path.join(target, 'my-site', 'kirigami.yaml'), 'kirigami: {}\n');
	stub.listeners.end.forEach((fn) => fn({ execution, exitCode: 0 }));
	await running;

	assert.equal(terminal.options.cwd, target);
	assert.ok(terminal.shown);
	assert.deepEqual(executed, ['npx --yes "@kirigami/cli" create']);
	assert.deepEqual(sent, []);
	assert.match(offered[0].message, /project created/);
	const open = stub.executed.find(([name]) => name === 'vscode.openFolder');
	assert.equal(open[1].fsPath, path.join(target, 'my-site'));
	assert.deepEqual(open[2], { forceNewWindow: true });
	await extension.deactivate();
});

test('without shell integration the wizard is typed into the terminal, and a failed wizard offers nothing', async (t) => {
	const target = tempDir(t);
	const sent = [];
	const terminal = { supportsIntegration: false, show() {}, sendText: (text) => sent.push(text) };
	const offered = [];
	const stub = stubVscode({ workspace: null, terminal, picks: { folder: target, info: (m) => offered.push(m) } });
	const extension = loadExtension(stub.vscode);
	await extension.activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });
	await stub.commands.get('kirigami.create')();
	assert.deepEqual(sent, ['npx --yes "@kirigami/cli" create']);
	assert.deepEqual(offered, []);

	// Shell integration present, but the wizard fails (e.g. aborted): no offer.
	const failing = { supportsIntegration: true, show() {}, sendText: (text) => sent.push(text) };
	const execution = {};
	failing.shellIntegration = { executeCommand: () => execution };
	const stub2 = stubVscode({ workspace: null, terminal: failing, picks: { folder: target, info: (m) => offered.push(m) } });
	const extension2 = loadExtension(stub2.vscode);
	await extension2.activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });
	fs.writeFileSync(path.join(target, 'kirigami.yaml'), 'kirigami: {}\n');
	const running = stub2.commands.get('kirigami.create')();
	await new Promise((resolve) => setImmediate(resolve));
	stub2.listeners.end.forEach((fn) => fn({ execution, exitCode: 1 }));
	await running;
	assert.deepEqual(offered, []);
	assert.ok(!stub2.executed.some(([name]) => name === 'vscode.openFolder'));

	// Cancelling the folder dialog does nothing.
	const stub3 = stubVscode({ workspace: null, terminal: failing, picks: { folder: null, info: (m) => offered.push(m) } });
	const extension3 = loadExtension(stub3.vscode);
	await extension3.activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });
	failing.options = undefined;
	await stub3.commands.get('kirigami.create')();
	assert.equal(failing.options, undefined);
});
