const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const Module = require('node:module');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

// Loads the compiled extension against a stub vscode API. The wizard's
// answers are scripted; the scaffolding really runs in the staged runtime's
// worker (external Node), with only GitHub stubbed — through NODE_OPTIONS
// --import, which the forked worker inherits.
function loadExtension(vscode) {
	const originalLoad = Module._load;
	const bundle = path.join(__dirname, '../dist/extension.js');
	delete require.cache[bundle];
	try {
		Module._load = function(name, ...args) { return name === 'vscode' ? vscode : originalLoad.call(this, name, ...args); };
		return require(bundle);
	} finally { Module._load = originalLoad; }
}

function stubVscode({ workspace, folder, answers }) {
	const disposable = { dispose() {} };
	const commands = new Map();
	const executed = [];
	const shown = { errors: [], warnings: [], info: [], quickPicks: [], inputs: [] };
	const vscode = {
		workspace: {
			isTrusted: true, workspaceFolders: workspace ? [{ uri: { fsPath: workspace } }] : undefined,
			getConfiguration: () => ({ get: () => process.execPath }),
		},
		window: {
			createOutputChannel: () => ({ ...disposable, append() {}, appendLine() {}, show() {} }),
			showErrorMessage: async (s) => { shown.errors.push(s); },
			showWarningMessage: async (s, _options, ...items) => { shown.warnings.push(s); return answers.warning?.(s, items); },
			showInformationMessage: async (message, ...items) => { shown.info.push({ message, items }); return answers.info?.(message, items); },
			showOpenDialog: async () => folder && [{ fsPath: folder }],
			showQuickPick: async (items, options) => { shown.quickPicks.push({ items, options }); return answers.quickPick(items, options); },
			showInputBox: async (options) => { shown.inputs.push(options); return answers.input(options); },
			withProgress: async (_options, task) => task({ report() {} }),
		},
		ProgressLocation: { Notification: 15 },
		commands: {
			registerCommand(name, fn) { commands.set(name, fn); return disposable; },
			executeCommand: async (...args) => { executed.push(args); },
		},
		Uri: { file: (fsPath) => ({ fsPath }) },
	};
	return { vscode, commands, executed, shown };
}

function tempDir(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-create-ext-'));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

function tarball(root, files) {
	const chunks = [];
	for (const [name, content] of Object.entries(files)) {
		const data = Buffer.from(content);
		const header = Buffer.alloc(512);
		header.write(`${root}/${name}`);
		header.write(data.length.toString(8).padStart(11, '0'), 124);
		header[156] = 48;
		chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
	}
	return zlib.gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

// Stubs GitHub (API + archive) and the home directory (template cache) in
// every Node process started while the test runs.
function stubGitHub(t, home) {
	const archive = path.join(home, 'template.tar.gz');
	fs.writeFileSync(archive, tarball('template-fixture-main', { 'kirigami.yaml': 'kirigami:\n  project: Template\n', 'src/_index.php': '<h1>Hi</h1>' }));
	const stub = path.join(home, 'stub.mjs');
	fs.writeFileSync(stub, `
import fs from 'node:fs';
import os from 'node:os';
os.homedir = () => ${JSON.stringify(home)};
globalThis.fetch = async (url) => String(url).startsWith('https://api.github.com/')
  ? new Response(JSON.stringify([{ name: 'template-fixture', full_name: 'php-kirigami/template-fixture', description: 'Fixture template', default_branch: 'main' }]))
  : new Response(fs.readFileSync(${JSON.stringify(archive)}));
`);
	const previous = process.env.NODE_OPTIONS;
	process.env.NODE_OPTIONS = `${previous ? `${previous} ` : ''}--import=${pathToFileURL(stub).href}`;
	t.after(() => { if (previous === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = previous; });
}

test('outside a Kirigami project only Create is registered; the wizard scaffolds through core and offers the new project', { timeout: 60000 }, async (t) => {
	const workspace = tempDir(t);
	const folder = tempDir(t);
	stubGitHub(t, tempDir(t));
	const stub = stubVscode({
		workspace, folder,
		answers: {
			quickPick: (items, options) => options.canPickMany ? [] : items.find((item) => item.label === 'fixture'),
			input: (options) => ({ 'Project directory, relative to the chosen folder': 'my-site', 'Project name': 'My Site', 'Site base URL': 'https://me.github.io' })[options.prompt] ?? options.value,
			info: () => 'Open in New Window',
		},
	});
	const extension = loadExtension(stub.vscode);
	await extension.activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });

	// No kirigami.yaml in the workspace: no project commands, no worker, no error.
	assert.deepEqual([...stub.commands.keys()], ['kirigami.create']);
	assert.ok(!stub.executed.some(([name]) => name === 'setContext'));

	await stub.commands.get('kirigami.create')();
	assert.deepEqual(stub.shown.errors, []);

	const templates = stub.shown.quickPicks[0].items;
	assert.deepEqual(templates.map((item) => [item.label, item.detail]), [['fixture', 'Fixture template']]);
	const target = path.join(folder, 'my-site');
	const yaml = fs.readFileSync(path.join(target, 'kirigami.yaml'), 'utf8');
	assert.match(yaml, /project: +My Site/);
	assert.match(yaml, /repo: +https:\/\/github.com\/me\/me.github.io/);
	assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).name, 'my-site');
	assert.equal(fs.readFileSync(path.join(target, 'src/_index.php'), 'utf8'), '<h1>Hi</h1>');
	// Options unchecked: no git repository, no npm install.
	assert.equal(fs.existsSync(path.join(target, '.git')), false);
	assert.equal(fs.existsSync(path.join(target, 'node_modules')), false);

	assert.match(stub.shown.info[0].message, /project created/);
	const open = stub.executed.find(([name]) => name === 'vscode.openFolder');
	assert.equal(open[1].fsPath, target);
	assert.deepEqual(open[2], { forceNewWindow: true });
	await extension.deactivate();
});

test('cancelling the wizard, or declining a non-empty folder, creates nothing', { timeout: 60000 }, async (t) => {
	const folder = tempDir(t);
	stubGitHub(t, tempDir(t));

	// Cancelling the folder dialog does nothing at all.
	const none = stubVscode({ workspace: null, folder: null, answers: { quickPick: () => { throw new Error('asked'); } } });
	const extension = loadExtension(none.vscode);
	await extension.activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });
	await none.commands.get('kirigami.create')();
	assert.deepEqual(none.shown.quickPicks, []);

	// Escape on the template pick.
	const escaped = stubVscode({ workspace: null, folder, answers: { quickPick: () => undefined, input: () => { throw new Error('asked'); } } });
	loadExtension(escaped.vscode).activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });
	await escaped.commands.get('kirigami.create')();
	assert.deepEqual(escaped.shown.errors, []);
	assert.deepEqual(fs.readdirSync(folder), []);

	// A folder that already holds files: the warning is declined.
	fs.writeFileSync(path.join(folder, 'notes.txt'), 'mine');
	const declined = stubVscode({
		workspace: null, folder,
		answers: { quickPick: (items) => items[0], input: (options) => options.value, warning: () => undefined },
	});
	loadExtension(declined.vscode).activate({ extensionPath: path.join(__dirname, '..'), subscriptions: [] });
	await declined.commands.get('kirigami.create')();
	assert.match(declined.shown.warnings[0], /already holds 1 item/);
	assert.deepEqual(fs.readdirSync(folder), ['notes.txt']);
	assert.deepEqual(declined.shown.info, []);
});
