import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createDevServer } from '../bin/libs/devserver.js';

async function fixture(t) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kirigami-server-'));
	fs.writeFileSync(path.join(root, 'index.html'), '<body>Healthy</body>');
	fs.writeFileSync(path.join(root, 'asset.txt'), 'asset');
	fs.writeFileSync(path.join(root, 'hello world.html'), 'Encoded filename');
	const server = await createDevServer({ root, port: 0 });
	t.after(async () => { await server.close(); fs.rmSync(root, { recursive: true, force: true }); });
	const request = pathname => new Promise((resolve, reject) => {
		const req = http.get({ hostname: server.address, port: server.port, path: pathname }, res => {
			let body = '';
			res.setEncoding('utf8');
			res.on('data', chunk => body += chunk);
			res.on('end', () => resolve({ status: res.statusCode, body }));
			res.on('error', reject);
		});
		req.on('error', reject);
		req.setTimeout(3000, () => req.destroy(new Error('Request timed out')));
	});
	return { root, request };
}

test('malformed path encodings return 400 and subsequent requests still work', async t => {
	const { request } = await fixture(t);
	for (const pathname of ['/%ZZ', '/%', '/%E0%A4%A', '/%FF', '/%00']) {
		assert.equal((await request(pathname)).status, 400, pathname);
		assert.equal((await request('/')).status, 200);
	}
	assert.match((await request('/hello%20world.html')).body, /Encoded filename/);
	assert.equal((await request('/?query=%ZZ')).status, 200);
	assert.equal((await request('/missing')).status, 404);
});

test('HTML and custom 404 read errors are contained', async t => {
	const { root, request } = await fixture(t);
	fs.writeFileSync(path.join(root, '404.html'), 'Custom missing page');
	assert.match((await request('/missing')).body, /Custom missing page/);
	const read = fs.readFileSync;
	for (const [file, url, code] of [['index.html', '/', 'ENOENT'], ['index.html', '/', 'EACCES'], ['404.html', '/missing', 'EACCES']]) {
		const mock = t.mock.method(fs, 'readFileSync', function(target, ...args) {
			if (target === path.join(root, file)) throw Object.assign(new Error('Injected read race'), { code });
			return read.call(this, target, ...args);
		});
		assert.equal((await request(url)).status, 500);
		mock.mock.restore();
		assert.equal((await request('/')).status, 200);
	}
});

test('stream failures before and after response headers do not stop the server', async t => {
	const { root, request } = await fixture(t);
	const create = fs.createReadStream;
	for (const partial of [false, true]) {
		let broken;
		const mock = t.mock.method(fs, 'createReadStream', function(target, ...args) {
			if (target !== path.join(root, 'asset.txt')) return create.call(this, target, ...args);
			let started = false;
			broken = new Readable({ read() {
				if (started) return;
				started = true;
				if (partial) this.push('partial content');
				setTimeout(() => this.destroy(Object.assign(new Error('Injected stream race'), { code: 'EIO' })), 20);
			} });
			return broken;
		});
		if (partial) await assert.rejects(request('/asset.txt'));
		else assert.equal((await request('/asset.txt')).status, 500);
		assert.equal(broken.destroyed, true);
		mock.mock.restore();
		assert.equal((await request('/asset.txt')).body, 'asset');
		assert.equal((await request('/')).status, 200);
	}
});
