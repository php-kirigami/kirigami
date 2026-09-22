import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Separate file: core modules capture the project directory on first import.
function fixture(t) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kirigami-export-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	fs.mkdirSync(path.join(root, 'src'));
	fs.writeFileSync(path.join(root, 'src', 'index.html'), 'Hello');
	return { root };
}

test('Project.export refuses unmarked output before triggers, and path overrides do not persist', async t => {
	const { root } = fixture(t);
	fs.writeFileSync(path.join(root, 'kirigami.yaml'), 'kirigami:\n  project: Export test\n  baseurl: https://example.com\n  root: src\n');
	fs.mkdirSync(path.join(root, 'scripts'));
	fs.writeFileSync(path.join(root, 'scripts', 'deploy.php'), '<?php echo 1;');
	const previousCwd = process.cwd();
	process.chdir(root);
	try {
		const { load } = await import('../index.js');
		const project = await load();
		project.config.scripts = [{ name: 'must-not-run', trigger: 'before-export' }];
		const refused = await project.export({ path: 'scripts' });
		assert.equal(refused.success, false);
		assert.match(refused.error, /Refusing to empty/);
		assert.equal(refused.beforeExport, null);
		assert.deepEqual(fs.readdirSync(path.join(root, 'scripts')), ['deploy.php']);

		project.config.scripts = [];
		const custom = await project.export({ path: 'out-custom' });
		assert.equal(custom.success, true, JSON.stringify(custom));
		assert.equal(project.config.export, undefined);
		const byDefault = await project.export();
		assert.equal(path.basename(byDefault.dist), 'dist');
		assert.ok(project.config.tasks.every(task => !('banner' in task)));
	} finally {
		process.chdir(previousCwd);
	}
});
