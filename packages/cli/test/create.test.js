import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

// The scaffolding itself is tested in core (packages/kirigami/test/create.test.js);
// this runs the real `kiri create` command end to end on top of it.
const banner = fs.readFileSync(new URL('../../kirigami/assets/banner-template.txt', import.meta.url), 'utf8');

function fixture(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri create test '));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

test('create handles templates with and without starter files and preserves existing project values', (t) => {
	const dir = fixture(t);
	// Run the real command in a child so cwd and the template cache stay isolated.
	// Only the GitHub API and the archive download are stubbed; extraction and scaffolding run.
	const worker = path.join(dir, 'verify.mjs');
	fs.writeFileSync(worker, `
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import create from ${JSON.stringify(new URL('../bin/cmd/create.js', import.meta.url).href)};
os.homedir = () => ${JSON.stringify(dir)};
let files;
globalThis.fetch = async (url) => {
  if (String(url).startsWith('https://api.github.com/')) {
    return new Response(JSON.stringify([{ name: 'template-fixture', full_name: 'fixture/template-fixture', default_branch: 'main' }]));
  }
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
