import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { test } from 'node:test';
import { Project } from '@kirigami/kirigami';
import { createServer } from '../index.js';

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

async function call(server, name, args) {
	const { result } = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
	return { ...result, data: result.isError ? result.content[0].text : JSON.parse(result.content[0].text) };
}

test('MCP lists templates and scaffolds a project without a loaded project', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-mcp-create-'));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	t.mock.method(os, 'homedir', () => dir);
	t.mock.method(globalThis, 'fetch', async (url) => {
		if (String(url).startsWith('https://api.github.com/')) {
			return new Response(JSON.stringify([{
				name: 'template-fixture', full_name: 'php-kirigami/template-fixture', description: 'Fixture',
				html_url: 'https://github.com/php-kirigami/template-fixture', default_branch: 'main',
			}]));
		}
		return new Response(tarball('template-fixture-main', { 'kirigami.yaml': 'kirigami:\n  project: Template\n' }));
	});

	// Never loaded: the server must not need a kirigami.yaml to scaffold one.
	const server = createServer(new Project());
	const listed = await call(server, 'kirigami_list_templates', {});
	assert.deepEqual(listed.data.templates.map(tpl => tpl.template), ['fixture']);

	const target = path.join(dir, 'site');
	const created = await call(server, 'kirigami_create_project', {
		template: 'fixture', directory: target, name: 'My Site', git: false, install: false,
	});
	assert.equal(created.isError, undefined);
	assert.equal(created.data.packageJson, 'starter');
	assert.equal(created.data.install, null);
	assert.match(fs.readFileSync(path.join(target, 'kirigami.yaml'), 'utf8'), /project: +My Site/);
	assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).name, 'my-site');

	const unknown = await call(server, 'kirigami_create_project', { template: 'nope', directory: target, install: false });
	assert.equal(unknown.isError, true);
	assert.match(unknown.data, /Unknown template "nope"/);
});
