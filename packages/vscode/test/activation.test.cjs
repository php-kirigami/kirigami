const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');

test('relocated extension activates and runs all commands without workspace dependencies or host chdir', { timeout: 60000 }, async t => {
	const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-extension-'));
	const extensionPath = path.join(temp, 'extension');
	const project = path.join(temp, 'site');
	fs.cpSync(path.join(__dirname, '../dist'), path.join(extensionPath, 'dist'), { recursive: true });
	fs.mkdirSync(path.join(project, 'src'), { recursive: true });
	fs.mkdirSync(path.join(project, 'scripts'));
	const config = { kirigami: { project: 'Before', root: 'src', baseurl: 'https://example.com' }, prepros: {}, export: { path: '../output' } };
	const save = () => fs.writeFileSync(path.join(project, 'kirigami.yaml'), JSON.stringify(config));
	save();
	fs.writeFileSync(path.join(project, 'src/_index.php'), '<p><?= $project ?></p>');
	fs.writeFileSync(path.join(project, 'scripts/check.php'), '<?php file_put_contents("/project/run.txt", "ran"); PREPROS::exportFile("/project/run.txt");');
	const commands = new Map();
	const errors = [];
	const logs = [];
	const info = [];
	let changed;
	let status;
	let cancelScript = false;
	const disposable = { dispose() {} };
	const vscode = {
		workspace: {
			isTrusted: true, workspaceFolders: [{ uri: { fsPath: project } }],
			getConfiguration: () => ({ get: () => process.execPath }),
			createFileSystemWatcher: () => ({ ...disposable, onDidChange(fn) { changed = fn; return disposable; }, onDidCreate: () => disposable }),
		},
		window: {
			createOutputChannel: () => ({ ...disposable, append: s => logs.push(s), appendLine: s => logs.push(s), show() {} }),
			createStatusBarItem: () => (status = { ...disposable, show() {} }),
			showErrorMessage: s => errors.push(s), showInformationMessage: s => info.push(s),
			showQuickPick: async items => typeof items[0] === 'object' && !cancelScript ? items[0] : undefined,
		},
		commands: { registerCommand(name, fn) { commands.set(name, fn); return disposable; }, executeCommand: async () => {} },
		StatusBarAlignment: { Right: 1 }, ThemeColor: class {}, RelativePattern: class {},
	};
	const originalLoad = Module._load;
	let extension;
	try {
		Module._load = function(name, ...args) { return name === 'vscode' ? vscode : originalLoad.call(this, name, ...args); };
		extension = require(path.join(extensionPath, 'dist/extension.js'));
	} finally { Module._load = originalLoad; }
	t.after(async () => { await extension.deactivate(); fs.rmSync(temp, { recursive: true, force: true }); });
	const cwd = process.cwd();
	await extension.activate({ extensionPath, subscriptions: [] });
	assert.equal(process.cwd(), cwd);
	assert.equal(commands.size, 6, logs.join('\n'));
	await commands.get('kirigami.validate')();
	await commands.get('kirigami.build')();
	assert.equal(fs.readFileSync(path.join(project, 'src/index.html'), 'utf8'), '<p>Before</p>');
	await commands.get('kirigami.export')();
	assert.match(fs.readFileSync(path.join(temp, 'output/index.html'), 'utf8'), /<p>Before<\/p>/);
	await commands.get('kirigami.run')();
	assert.equal(fs.readFileSync(path.join(project, 'run.txt'), 'utf8'), 'ran');
	config.kirigami.project = 'After'; save();
	await changed();
	await commands.get('kirigami.build')();
	assert.equal(fs.readFileSync(path.join(project, 'src/index.html'), 'utf8'), '<p>After</p>');
	fs.unlinkSync(path.join(project, 'src/index.html'));
	await commands.get('kirigami.toggleServer')();
	assert.match(status.text, /radio-tower/);
	assert.match(await (await fetch('http://127.0.0.1:4321/')).text(), /<p>After<\/p>/);
	await commands.get('kirigami.toggleServer')();
	assert.match(status.text, /circle-outline/);
	assert.deepEqual(errors, []);
	assert.ok(info.length >= 4);
	const successes = info.length;
	fs.writeFileSync(path.join(project, 'scripts/check.php'), '<?php throw new Exception("A14 script failure");');
	await commands.get('kirigami.run')();
	assert.equal(errors.length, 1);
	assert.match(errors[0], /check.*failed/);
	assert.equal(info.length, successes, 'A failed result must not produce a success notification');
	// CLI-style report: the script line, then the error block.
	assert.ok(logs.some(line => /^› SCRIPT: check ❌$/.test(line)), logs.join('\n'));
	assert.ok(logs.some(line => /A14 script failure/.test(line)));
	// No raw ANSI codes reach the output channel.
	assert.ok(!logs.some(line => /\x1b\[/.test(line)));
	cancelScript = true;
	await commands.get('kirigami.run')();
	assert.equal(errors.length, 1, 'Cancel must not execute the failing script');
	assert.equal(info.length, successes);
	cancelScript = false;
	fs.writeFileSync(path.join(project, 'scripts/check.php'), '<?php echo "Recovered";');
	await commands.get('kirigami.run')();
	assert.equal(info.length, successes + 1);
	assert.equal(errors.length, 1);
	fs.writeFileSync(path.join(project, 'src/_index.php'), '<?php throw new Exception("Initial preview failure");');
	await commands.get('kirigami.toggleServer')();
	assert.equal(errors.length, 2);
	assert.match(status.text, /error/);
	assert.ok(logs.some(line => /Initial preview failure/.test(line)));
	await assert.rejects(fetch('http://127.0.0.1:4321/'));
	fs.writeFileSync(path.join(project, 'src/_index.php'), '<p>Recovered preview</p>');
	await commands.get('kirigami.toggleServer')();
	assert.match(await (await fetch('http://127.0.0.1:4321/')).text(), /Recovered preview/);
	await commands.get('kirigami.toggleServer')();
	await extension.deactivate();
	await assert.rejects(fetch('http://127.0.0.1:4321/'));
});
