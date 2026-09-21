const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vscode = require('vscode');

exports.run = async function() {
	const folder = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const cwd = process.cwd();
	const extension = vscode.extensions.getExtension('php-kirigami.kirigami-vscode');
	assert.ok(extension, 'Extension is discoverable');
	await extension.activate();
	assert.equal(process.cwd(), cwd);
	const commands = await vscode.commands.getCommands(true);
	for (const command of ['build', 'export', 'validate', 'run', 'toggleServer']) {
		assert.ok(commands.includes(`kirigami.${command}`), `Registered ${command}`);
	}
	await vscode.commands.executeCommand('kirigami.validate');
	await vscode.commands.executeCommand('kirigami.build');
	assert.equal(fs.readFileSync(path.join(folder, 'src/index.html'), 'utf8'), '<p>Host test</p>');
	await vscode.commands.executeCommand('kirigami.export');
	assert.match(fs.readFileSync(path.join(folder, 'dist/index.html'), 'utf8'), /<p>Host test<\/p>/);
	// No script picker is shown when the fixture contains no scripts.
	await vscode.commands.executeCommand('kirigami.run');
	const started = vscode.commands.executeCommand('kirigami.toggleServer');
	let response;
	for (let i = 0; i < 100; i++) {
		try { response = await fetch('http://127.0.0.1:4321/'); break; } catch {}
		await new Promise(resolve => setTimeout(resolve, 100));
	}
	assert.ok(response, 'Dev server started');
	assert.match(await response.text(), /<p>Host test<\/p>/);
	await new Promise(resolve => setTimeout(resolve, 500));
	await vscode.commands.executeCommand('workbench.action.closeQuickOpen');
	await started;
	await vscode.commands.executeCommand('kirigami.toggleServer');
	await assert.rejects(fetch('http://127.0.0.1:4321/'));
	fs.writeFileSync(path.join(folder, 'host-test-passed.json'), JSON.stringify({ vscode: vscode.version, hostNode: process.version, cwdUnchanged: process.cwd() === cwd }));
};
