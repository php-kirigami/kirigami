import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { writeMinimalPackageJson, copyStarterBanner } from '../bin/starter.js';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const coreDir = new URL('../../kirigami/', import.meta.url);
const banner = fs.readFileSync(new URL('assets/banner-template.txt', coreDir), 'utf8');

function fixture(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri create test '));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

test('starter uses the CLI, core and Canva manifests and preserves banner tokens', (t) => {
	const dir = fixture(t);
	writeMinimalPackageJson(dir, { slug: 'test-site', description: 'A site', author: 'Tester' });
	const pkg = readJson(path.join(dir, 'package.json'));
	assert.deepEqual(pkg.devDependencies, {
		'@kirigami/cli': `^${readJson(new URL('../package.json', import.meta.url)).version}`,
		'@kirigami/kirigami': `^${readJson(new URL('package.json', coreDir)).version}`,
		'@kirigami/canva': `^${readJson(new URL('../../canva/package.json', import.meta.url)).version}`,
	});
	assert.equal(pkg.name, 'test-site');
	assert.equal(pkg.description, 'A site');
	assert.equal(pkg.author, 'Tester');
	assert.equal(pkg.scripts.build, 'kiri build');
	assert.equal(pkg.private, true);
	assert.equal(copyStarterBanner(dir), true);
	assert.equal(fs.readFileSync(path.join(dir, 'banner.txt'), 'utf8'), banner);
	assert.match(banner, /###PROJECT###/);
});

test('existing banner is never overwritten', (t) => {
	const dir = fixture(t);
	fs.writeFileSync(path.join(dir, 'banner.txt'), 'Custom banner');
	assert.equal(copyStarterBanner(dir), false);
	assert.equal(fs.readFileSync(path.join(dir, 'banner.txt'), 'utf8'), 'Custom banner');
});

test('starter resolves a nested installed package graph outside the monorepo', async (t) => {
	const dir = fixture(t);
	const cli = path.join(dir, 'node_modules/@kirigami/cli');
	const core = path.join(cli, 'node_modules/@kirigami/kirigami');
	const canva = path.join(core, 'node_modules/@kirigami/canva');
	for (const location of [path.join(cli, 'bin'), path.join(core, 'assets'), canva]) {
		fs.mkdirSync(location, { recursive: true });
	}
	fs.writeFileSync(path.join(cli, 'package.json'), JSON.stringify({ type: 'module', version: '3.4.5' }));
	for (const [location, version] of [[core, '6.7.8'], [canva, '9.10.11']]) {
		fs.writeFileSync(path.join(location, 'package.json'), JSON.stringify({
			version, exports: { './package.json': './package.json' },
		}));
	}
	fs.copyFileSync(new URL('../bin/starter.js', import.meta.url), path.join(cli, 'bin/starter.js'));
	fs.writeFileSync(path.join(core, 'assets/banner-template.txt'), 'Installed ###PROJECT### banner');
	const starter = await import(pathToFileURL(path.join(cli, 'bin/starter.js')).href);
	starter.writeMinimalPackageJson(dir, { slug: 'isolated' });
	assert.deepEqual(readJson(path.join(dir, 'package.json')).devDependencies, {
		'@kirigami/cli': '^3.4.5', '@kirigami/kirigami': '^6.7.8', '@kirigami/canva': '^9.10.11',
	});
	assert.equal(starter.copyStarterBanner(dir), true);
	assert.equal(fs.readFileSync(path.join(dir, 'banner.txt'), 'utf8'), 'Installed ###PROJECT### banner');
});

test('create handles templates with and without starter files and preserves existing project values', (t) => {
	const dir = fixture(t);
	// Run the real command in a child so cwd and the template cache stay isolated.
	// Only template discovery/download are stubbed; extraction and scaffolding run.
	const worker = path.join(dir, 'verify.mjs');
	fs.writeFileSync(worker, `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { Cache } from ${JSON.stringify(import.meta.resolve('@kirigami/sdk'))};
import create from ${JSON.stringify(new URL('../bin/cmd/create.js', import.meta.url).href)};
os.homedir = () => ${JSON.stringify(dir)};
Cache.prototype.get = () => [{ name: 'template-fixture', full_name: 'fixture/template-fixture', default_branch: 'main' }];
let files;
globalThis.fetch = async () => {
  const chunks = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write('template-fixture/' + name);
    header.write(data.length.toString(8).padStart(11, '0'), 124);
    header[156] = 48;
    chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  return { ok: true, arrayBuffer: async () => zlib.gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)])) };
};
process.chdir(${JSON.stringify(dir)});
const read = (target, file) => fs.readFileSync(path.join(target, file), 'utf8');
const run = (target) => create(['fixture', target, '--yes', '--no-git', '--no-install']);
files = { 'kirigami.yaml': 'kirigami:\\n  project: Template\\nprepros: {}\\n', '_index.php': '<h1>Hello</h1>' };
await run('minimal');
const minimal = JSON.parse(read('minimal', 'package.json'));
assert.ok(minimal.devDependencies['@kirigami/cli']);
assert.ok(!JSON.stringify(minimal).includes('undefined'));
assert.equal(read('minimal', 'banner.txt'), ${JSON.stringify(banner)});
assert.match(read('minimal', 'kirigami.yaml'), /banner: +banner.txt/);
assert.match(read('minimal', 'kirigami.yaml'), /project: +minimal/);
assert.equal(read('minimal', '_index.php'), '<h1>Hello</h1>');
files['package.json'] = JSON.stringify({ name: 'template', scripts: { custom: 'echo template' }, devDependencies: { '@kirigami/cli': '^0.1.0' } });
files['banner.txt'] = 'Template banner';
await run('complete');
assert.equal(read('complete', 'banner.txt'), 'Template banner');
assert.equal(JSON.parse(read('complete', 'package.json')).scripts.custom, 'echo template');
fs.mkdirSync('existing');
fs.writeFileSync('existing/package.json', JSON.stringify({ name: 'existing-name', scripts: { custom: 'echo existing' }, devDependencies: { '@kirigami/cli': '^7.0.0' } }));
fs.writeFileSync('existing/banner.txt', 'Existing banner');
await run('existing');
const existing = JSON.parse(read('existing', 'package.json'));
assert.equal(existing.name, 'existing-name');
assert.equal(existing.scripts.custom, 'echo existing');
assert.equal(existing.devDependencies['@kirigami/cli'], '^7.0.0');
assert.equal(read('existing', 'banner.txt'), 'Existing banner');
`);
	execFileSync(process.execPath, [worker], { cwd: dir, stdio: 'pipe' });
});
