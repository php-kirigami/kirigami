import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createPHPRuntime } from '../index.js';

// Fake phpext packages: the .so files aren't real modules (PHP only warns at
// startup), but the generated .ini files show what the loader resolved.
function writePackage(root, dir, files) {
	const pkg = path.join(root, 'node_modules', '@kirigami', dir);
	fs.mkdirSync(pkg, { recursive: true });
	for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(pkg, name), content);
}

// index.js in the shape php-wasm-compiler generates: modules in load order.
const register = (modules) => `import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('.', import.meta.url));
export default function register(phpVersion) {
	return ${JSON.stringify(modules)}.map((m) => ({ ...m, soPath: join(dir, m.name + '.so') }));
}
`;

const manifest = (name, iniEntries) => JSON.stringify({ name, artifacts: [{ phpVersion: '8.5', sourcePath: `${name}.so` }], iniEntries });

test('multi-module phpext packages load dependencies once and first', { timeout: 60000 }, async (t) => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-phpext-'));
	const previous = { cwd: process.cwd(), discovery: process.env.KIRIGAMI_PHPEXT_DISCOVERY };
	// Both packages bundle mysqlnd, like phpext-mysqli and phpext-pdo_mysql.
	writePackage(root, 'phpext-mysqli', {
		'package.json': '{"type":"module"}',
		'index.js': register([{ name: 'mysqlnd' }, { name: 'mysqli', iniEntries: { 'mysqli.reconnect': '0' } }]),
		'mysqlnd.so': 'x', 'mysqli.so': 'x',
	});
	writePackage(root, 'phpext-pdo_mysql', {
		'package.json': '{"type":"module"}',
		'index.js': register([{ name: 'mysqlnd' }, { name: 'pdo_mysql' }]),
		'mysqlnd.so': 'x', 'pdo_mysql.so': 'x',
	});
	// No register(): the loader falls back to manifest.json.
	writePackage(root, 'phpext-plain', { 'manifest.json': manifest('plain', { 'plain.flag': '1' }), 'plain.so': 'x' });
	// A register() that throws also falls back to manifest.json.
	writePackage(root, 'phpext-broken', {
		'package.json': '{"type":"module"}',
		'index.js': 'export default function register() { throw new Error("broken"); }',
		'manifest.json': manifest('broken'), 'broken.so': 'x',
	});
	process.chdir(root);
	process.env.KIRIGAMI_PHPEXT_DISCOVERY = 'local';
	t.after(() => {
		process.chdir(previous.cwd);
		if (previous.discovery === undefined) delete process.env.KIRIGAMI_PHPEXT_DISCOVERY;
		else process.env.KIRIGAMI_PHPEXT_DISCOVERY = previous.discovery;
		fs.rmSync(root, { recursive: true, force: true });
	});

	// Keep the fake modules' startup warnings out of the test output.
	const quiet = [t.mock.method(console, 'error', () => {}), t.mock.method(console, 'warn', () => {}), t.mock.method(process.stderr, 'write', () => true), t.mock.method(process.stdout, 'write', () => true)];
	const php = await createPHPRuntime();
	t.after(() => php.exit());
	const { text } = await php.run({ code: `<?php
		$files = array_filter(array_map('trim', explode(',', php_ini_scanned_files() ?: '')));
		$out = [];
		foreach ($files as $f) $out[basename($f)] = file_get_contents($f);
		echo "\\n@@", json_encode($out);` });
	for (const mock of quiet) mock.mock.restore();
	// Startup warnings about the fake modules come first.
	const inis = JSON.parse(text.slice(text.lastIndexOf('@@') + 2));
	const names = Object.keys(inis);

	// One file per module, numbered in load order, so PHP's alphabetical
	// scan follows it.
	assert.deepEqual(names.map((n) => n.replace(/^\d{3}-|\.ini$/g, '')).sort(), ['broken', 'mysqli', 'mysqlnd', 'pdo_mysql', 'plain']);
	assert.deepEqual(names.map((n) => n.slice(0, 3)), ['000', '001', '002', '003', '004']);
	const position = (name) => names.findIndex((n) => n.endsWith(`-${name}.ini`));
	assert.ok(position('mysqlnd') < position('mysqli'));
	assert.ok(position('mysqlnd') < position('pdo_mysql'));
	assert.equal(position('mysqli'), position('mysqlnd') + 1, 'a package loads its modules together');

	const ini = (name) => inis[names[position(name)]];
	assert.match(ini('mysqlnd'), /^extension=.*\/mysqlnd\.so$/m);
	assert.match(ini('mysqli'), /^mysqli\.reconnect=0$/m);
	assert.match(ini('plain'), /^plain\.flag=1$/m);
	assert.match(ini('broken'), /^extension=.*\/broken\.so$/m);
});
