import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import dist, { EXPORT_MARKER, assertSafeExportPaths } from '../bin/tasks/dist.js';

function fixture(t) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kirigami-export-'));
	t.after(() => fs.rmSync(root, { recursive: true, force: true }));
	const source = path.join(root, 'src');
	fs.mkdirSync(source);
	fs.writeFileSync(path.join(source, 'index.html'), 'Hello ###YEAR###');
	fs.writeFileSync(path.join(root, 'keep.txt'), 'keep');
	return { root, source };
}

for (const kind of ['same', 'parent', 'child', 'normalized']) {
	test(`rejects ${kind} destination without deleting or creating files`, async t => {
		const { root, source } = fixture(t);
		const destination = { same: source, parent: root, child: path.join(source, 'new', 'dist'), normalized: path.join(source, 'child', '..') }[kind];
		const result = await dist(source, { path: destination });
		assert.equal(result.success, false);
		assert.match(result.error, /must not overlap/);
		assert.equal(fs.readFileSync(path.join(source, 'index.html'), 'utf8'), 'Hello ###YEAR###');
		assert.equal(fs.readFileSync(path.join(root, 'keep.txt'), 'utf8'), 'keep');
		assert.deepEqual(fs.readdirSync(source), ['index.html']);
	});
}

test('rejects junction aliases and missing children beneath them', async t => {
	const { root, source } = fixture(t);
	const alias = path.join(root, 'alias');
	fs.symlinkSync(source, alias, process.platform === 'win32' ? 'junction' : 'dir');
	for (const destination of [alias, path.join(alias, 'new', 'dist')]) {
		const result = await dist(source, { path: destination });
		assert.equal(result.success, false);
		assert.match(result.error, /must not overlap/);
	}
	assert.deepEqual(fs.readdirSync(source), ['index.html']);
});

test('exports public assets, excludes private sources, and replaces previous output', async t => {
	const { root, source } = fixture(t);
	const files = ['helper.php', 'UPPER.PHP', '_page.php', '.env', '.private/data.txt', '.git/config', '_layouts/header.php', 'assets/.hidden/key.txt', 'assets/data.json', 'assets/app.min.js', 'assets/app.js', 'assets/app.min.js.map', 'assets/main.scss', 'notes.txt'];
	for (const file of files) {
		fs.mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
		fs.writeFileSync(path.join(source, file), 'content');
	}
	// Similar names are siblings, not overlapping paths.
	const destination = path.join(root, 'src-output');
	fs.mkdirSync(destination);
	fs.writeFileSync(path.join(destination, EXPORT_MARKER), '');
	fs.writeFileSync(path.join(destination, 'stale.txt'), 'old output');
	const result = await dist(source, { path: destination, ignore: ['notes.txt'], banner: 'Test banner' });
	assert.equal(result.success, true, result.error);
	assert.deepEqual(result.files.map(file => path.relative(destination, file).replaceAll('\\', '/')).sort(), ['assets/app.min.js', 'assets/data.json', 'index.html']);
	assert.equal(fs.existsSync(path.join(destination, 'stale.txt')), false);
	assert.equal(fs.existsSync(path.join(destination, EXPORT_MARKER)), true);
	assert.match(fs.readFileSync(path.join(destination, 'index.html'), 'utf8'), /Test banner/);
	assert.equal(fs.readFileSync(path.join(source, 'helper.php'), 'utf8'), 'content');
});

test('Project.export rejects overlap before executing triggers or changing output', async t => {
	const { root, source } = fixture(t);
	fs.writeFileSync(path.join(root, 'kirigami.yaml'), 'kirigami:\n  project: Export test\n  baseurl: https://example.com\n  root: src\n');
	const previousCwd = process.cwd();
	process.chdir(root);
	try {
		// Core modules capture the project directory when first imported.
		const { load } = await import('../index.js');
		const project = await load();
		project.config.scripts = [{ name: 'must-not-run', trigger: 'before-export' }];
		const result = await project.export({ path: source });
		assert.equal(result.success, false);
		assert.match(result.error, /must not overlap/);
		assert.equal(result.beforeExport, null);
		assert.deepEqual(result.results, []);
		assert.equal(fs.readFileSync(path.join(source, 'index.html'), 'utf8'), 'Hello ###YEAR###');
	} finally {
		process.chdir(previousCwd);
	}
});

test('refuses to empty a non-empty destination without an export marker', async t => {
	const { root, source } = fixture(t);
	const scripts = path.join(root, 'scripts');
	fs.mkdirSync(scripts);
	fs.writeFileSync(path.join(scripts, 'deploy.php'), '<?php echo 1;');
	const result = await dist(source, { path: scripts });
	assert.equal(result.success, false);
	assert.match(result.error, /Refusing to empty/);
	assert.deepEqual(fs.readdirSync(scripts), ['deploy.php']);
});

test('writes a marker so the next export can replace its own output', async t => {
	const { root, source } = fixture(t);
	const destination = path.join(root, 'out');
	assert.equal((await dist(source, { path: destination })).success, true);
	assert.equal(fs.existsSync(path.join(destination, EXPORT_MARKER)), true);
	fs.writeFileSync(path.join(destination, 'stale.txt'), 'old output');
	assert.equal((await dist(source, { path: destination })).success, true);
	assert.equal(fs.existsSync(path.join(destination, 'stale.txt')), false);
});

test('rejects a destination that contains the project directory', t => {
	const { root, source } = fixture(t);
	// The destination holds the project but not the source tree.
	const project = path.join(root, 'sites', 'blog');
	fs.mkdirSync(project, { recursive: true });
	assert.throws(() => assertSafeExportPaths(source, path.join(root, 'sites'), project), /contains the project directory/);
	assert.doesNotThrow(() => assertSafeExportPaths(source, path.join(project, 'dist'), project));
});
