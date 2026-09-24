import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('minimal rendering, optional layouts and PHP diagnostics survive build/export aggregation', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-minimal-'));
	const cwd = process.cwd();
	const write = (file, text) => {
		fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		fs.writeFileSync(path.join(dir, file), text);
	};
	const config = { kirigami: { project: 'Minimal', baseurl: 'https://example.com', root: 'src' }, prepros: {} };
	const save = () => write('kirigami.yaml', JSON.stringify(config));
	const html = '<p>Hello</p>';
	write('src/_index.php', html);
	save();
	process.chdir(dir);
	const { load } = await import('../index.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});
	const project = await load();
	const prepros = result => result.results.find(r => r.type === 'prepros');
	const read = (file = 'src/index.html') => fs.readFileSync(path.join(dir, file), 'utf8');
	await t.test('empty prepros builds and exports without warnings or polluted HTML', async () => {
		const built = await project.build();
		assert.equal(built.success, true, JSON.stringify(built));
		assert.equal(prepros(built).warnings, undefined);
		assert.equal(read(), html);
		const exported = await project.export({ path: path.join(dir, 'dist') });
		assert.equal(exported.success, true, JSON.stringify(exported));
		assert.equal(prepros(exported).warnings, undefined);
		assert.match(read('dist/index.html'), /<p>Hello<\/p>/);
		assert.doesNotMatch(read('dist/index.html'), /Warning|Undefined property/);
	});
	await t.test('one-sided and complete global layouts retain wrapping behavior', async () => {
		write('src/header.php', '<header>Header</header>');
		write('src/footer.php', '<footer>Footer</footer>');
		for (const before of [false, true]) for (const after of [false, true]) {
			config.prepros = { ...(before && { before: 'header.php' }), ...(after && { after: 'footer.php' }) };
			save();
			await project.reload();
			const result = await project.build();
			assert.equal(result.success, true, JSON.stringify(result));
			assert.equal(prepros(result).warnings, undefined);
			assert.equal(read(), (before ? '<header>Header</header>' : '') + html + (after ? '<footer>Footer</footer>' : ''));
		}
	});
	await t.test('render and sitemap warnings are retained without entering HTML', async () => {
		config.prepros = { includes: ['diagnostics.php'] };
		write('src/diagnostics.php', `<?php global $argv; trigger_error(($argv[1] === 'sitemap' ? 'sitemap-warning' : 'render-warning'), E_USER_WARNING);`);
		write('src/_index.php', '<?php trigger_error("page-warning", E_USER_WARNING); ?><p>Hello</p>');
		save();
		await project.reload();
		for (const result of [await project.build(), await project.export({ path: path.join(dir, 'dist') })]) {
			assert.equal(result.success, true, JSON.stringify(result));
			for (const marker of ['render-warning', 'page-warning', 'sitemap-warning']) assert.match(prepros(result).warnings, new RegExp(marker));
		}
		assert.equal(read(), html);
		assert.doesNotMatch(read('dist/index.html'), /warning|Warning/);
	});
	await t.test('sitemap failure retains preceding render diagnostics and produced files', async () => {
		write('src/diagnostics.php', `<?php global $argv; if ($argv[1] === 'sitemap') throw new Exception('sitemap-failed'); trigger_error('render-warning', E_USER_WARNING);`);
		await project.reload();
		const result = await project.build();
		assert.equal(result.success, false);
		assert.match(prepros(result).error, /sitemap-failed/);
		assert.match(prepros(result).warnings, /render-warning/);
		assert.match(prepros(result).warnings, /page-warning/);
		assert.ok(prepros(result).files.some(file => file.replaceAll('\\', '/') === 'src/index.html'));
	});
	await t.test('render failure still reports its diagnostic and stops before sitemap', async () => {
		config.prepros = {};
		write('src/_index.php', '<?php throw new Exception("render-failed");');
		save();
		await project.reload();
		const result = await project.build();
		assert.equal(result.success, false);
		assert.match(prepros(result).error, /render-failed/);
	});
});
