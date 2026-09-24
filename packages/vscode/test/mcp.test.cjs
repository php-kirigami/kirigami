const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { test } = require('node:test');

const extensionPath = path.join(__dirname, '..');

function loadExtension(vscode) {
	const originalLoad = Module._load;
	const bundle = path.join(extensionPath, 'dist/extension.js');
	delete require.cache[bundle];
	try {
		Module._load = function(name, ...args) { return name === 'vscode' ? vscode : originalLoad.call(this, name, ...args); };
		return require(bundle);
	} finally { Module._load = originalLoad; }
}

function stubVscode(folder, { withMcpApi = true } = {}) {
	const disposable = { dispose() {} };
	const providers = new Map();
	class McpStdioServerDefinition {
		constructor(label, command, args, env, version) { Object.assign(this, { label, command, args, env, version }); }
	}
	const vscode = {
		workspace: {
			isTrusted: true, workspaceFolders: folder ? [{ uri: { fsPath: folder } }] : undefined,
			getConfiguration: () => ({ get: () => process.execPath }),
			createFileSystemWatcher: () => ({ ...disposable, onDidCreate: () => disposable, onDidDelete: () => disposable, onDidChange: () => disposable }),
		},
		window: {
			createOutputChannel: () => ({ ...disposable, append() {}, appendLine() {}, show() {} }),
			createStatusBarItem: () => ({ ...disposable, show() {} }),
			showErrorMessage() {}, showInformationMessage() {},
		},
		commands: { registerCommand: () => disposable, executeCommand: async () => {} },
		EventEmitter: class { constructor() { this.event = () => disposable; } fire() {} dispose() {} },
		RelativePattern: class {},
		StatusBarAlignment: { Right: 1 }, ThemeColor: class {},
		McpStdioServerDefinition,
	};
	if (withMcpApi) vscode.lm = { registerMcpServerDefinitionProvider: (id, provider) => { providers.set(id, provider); return disposable; } };
	return { vscode, providers };
}

function tempDir(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-mcp-ext-'));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

// Minimal MCP client over the server's stdio (newline-delimited JSON-RPC).
function mcpClient(child) {
	let buffer = '';
	let stderr = '';
	const waiters = new Map();
	child.stderr.on('data', (d) => { stderr += d; });
	child.stdout.on('data', (d) => {
		buffer += d;
		let newline;
		while ((newline = buffer.indexOf('\n')) >= 0) {
			const line = buffer.slice(0, newline).trim();
			buffer = buffer.slice(newline + 1);
			if (line) { const message = JSON.parse(line); waiters.get(message.id)?.(message); }
		}
	});
	let id = 0;
	return {
		call(method, params) {
			return new Promise((resolve, reject) => {
				const n = ++id;
				const timer = setTimeout(() => reject(new Error(`${method} timed out; stderr: ${stderr}`)), 30000);
				waiters.set(n, (message) => { clearTimeout(timer); resolve(message); });
				child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n');
			});
		},
		notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n'); },
	};
}

test('in a Kirigami folder the extension offers the staged MCP server, which serves the project over stdio', { timeout: 60000 }, async (t) => {
	// Cleaned up by hand, in order: processes using the folder as their cwd must
	// exit before Windows lets it be removed.
	const project = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-mcp-ext-'));
	let child;
	let extension;
	t.after(async () => {
		if (child && child.exitCode === null) { child.kill(); await once(child, 'exit'); }
		await extension?.deactivate();
		fs.rmSync(project, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
	});
	fs.mkdirSync(path.join(project, 'src'));
	fs.writeFileSync(path.join(project, 'src/_index.php'), '<p><?= $project ?></p>');
	fs.writeFileSync(path.join(project, 'kirigami.yaml'), JSON.stringify({ kirigami: { project: 'MCP test', baseurl: 'https://example.com', root: 'src' }, prepros: {} }));

	const { vscode, providers } = stubVscode(project);
	extension = loadExtension(vscode);
	await extension.activate({ extensionPath, subscriptions: [] });

	const [definition] = await providers.get('kirigami').provideMcpServerDefinitions();
	assert.equal(definition.label, 'Kirigami');
	assert.equal(definition.command, process.execPath);
	assert.equal(definition.cwd.fsPath, project);
	assert.ok(fs.existsSync(definition.args[0]), `staged MCP entry missing: ${definition.args[0]}`);
	assert.match(definition.version, /^\d+\.\d+\.\d+/);

	// Launch it the way VS Code would, and use it.
	child = spawn(definition.command, definition.args, {
		cwd: definition.cwd.fsPath, stdio: ['pipe', 'pipe', 'pipe'],
		env: { ...process.env, ...definition.env, KIRIGAMI_PHPEXT_DISCOVERY: 'off' },
	});
	const client = mcpClient(child);
	const init = await client.call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
	assert.equal(init.result.serverInfo.name, 'kirigami');
	client.notify('notifications/initialized');
	const tools = (await client.call('tools/list', {})).result.tools.map((tool) => tool.name);
	for (const name of ['kirigami_build', 'kirigami_export', 'kirigami_run', 'kirigami_validate']) assert.ok(tools.includes(name), name);
	const build = await client.call('tools/call', { name: 'kirigami_build', arguments: {} });
	assert.ok(!build.result.isError, JSON.stringify(build.result));
	assert.equal(fs.readFileSync(path.join(project, 'src/index.html'), 'utf8'), '<p>MCP test</p>');
});

test('no server outside a Kirigami folder, and no registration on VS Code versions without the MCP API', async (t) => {
	const plain = tempDir(t);
	const stub = stubVscode(plain);
	const extension = loadExtension(stub.vscode);
	await extension.activate({ extensionPath, subscriptions: [] });
	assert.deepEqual(await stub.providers.get('kirigami').provideMcpServerDefinitions(), []);
	await extension.deactivate();

	const old = stubVscode(plain, { withMcpApi: false });
	const oldExtension = loadExtension(old.vscode);
	await oldExtension.activate({ extensionPath, subscriptions: [] });
	assert.equal(old.providers.size, 0);
	await oldExtension.deactivate();
});
