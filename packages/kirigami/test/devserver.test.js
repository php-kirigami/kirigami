import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { Readable } from 'node:stream';
import test from 'node:test';
import { createDevServer } from '../bin/libs/devserver.js';

async function fixture(t) {
	// Real path: the server resolves files through it, and the read mocks
	// below compare paths (on Windows, os.tmpdir() can be an 8.3 short name).
	const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'kirigami-server-')));
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

test('private source paths are denied while public assets and directory indexes work', async t => {
	const { root, request } = await fixture(t);
	const privateFiles = ['helper.php', 'UPPER.PHP', 'template.phtml', 'archive.phar', '.env', '.git/config', '_data/data.json', 'nested/_page.html', 'nested/.secret/key.txt', 'styles/source.scss', 'styles/source.sass'];
	for (const file of privateFiles) {
		fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
		fs.writeFileSync(path.join(root, file), 'PRIVATE CONTENT');
	}
	for (const file of [...privateFiles, '%68elper%2ephp', '%2eenv', '%5fdata/data.json', 'nested%5c.secret%5ckey.txt', 'helper.php.', 'helper.php%20', 'helper.php::$DATA', '../outside.txt', '%2e%2e/outside.txt']) {
		const response = await request('/' + file);
		assert.equal(response.status, 404, file);
		assert.doesNotMatch(response.body, /PRIVATE CONTENT/);
	}
	for (const file of ['public/index.html', 'assets/app.js', 'assets/app.js.map', 'assets/site.css', 'assets/data.json', 'assets/image.svg']) {
		fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
		fs.writeFileSync(path.join(root, file), 'PUBLIC CONTENT');
		const response = await request('/' + file);
		assert.equal(response.status, 200, file);
		assert.match(response.body, /PUBLIC CONTENT/);
	}
	for (const url of ['/public', '/public/']) assert.equal((await request(url)).status, 200);
});

test('junctions cannot expose outside or private targets, including the 404 fallback', async t => {
	const { root, request } = await fixture(t);
	const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'kirigami-outside-'));
	t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
	fs.writeFileSync(path.join(outside, 'index.html'), 'OUTSIDE SECRET');
	fs.mkdirSync(path.join(root, '_private'));
	fs.writeFileSync(path.join(root, '_private/index.html'), 'PRIVATE SECRET');
	fs.mkdirSync(path.join(root, 'public'));
	fs.writeFileSync(path.join(root, 'public/index.html'), 'PUBLIC TARGET');
	const kind = process.platform === 'win32' ? 'junction' : 'dir';
	fs.symlinkSync(outside, path.join(root, 'escape'), kind);
	fs.symlinkSync(path.join(root, '_private'), path.join(root, 'alias'), kind);
	fs.symlinkSync(path.join(root, 'public'), path.join(root, 'allowed'), kind);
	fs.symlinkSync(outside, path.join(root, '404.html'), kind);
	for (const url of ['/escape/', '/escape/index.html', '/alias/', '/alias/index.html', '/404.html', '/missing']) {
		const response = await request(url);
		assert.equal(response.status, 404, url);
		assert.doesNotMatch(response.body, /SECRET/);
	}
	assert.match((await request('/allowed/')).body, /PUBLIC TARGET/);
});

test('public-looking file symlinks cannot expose PHP, including the custom 404', async t => {
	const { root, request } = await fixture(t);
	fs.writeFileSync(path.join(root, 'secret.php'), 'PHP SECRET');
	try { fs.symlinkSync(path.join(root, 'secret.php'), path.join(root, 'page.html'), 'file'); }
	catch (error) {
		if (error.code !== 'EPERM') throw error;
		t.skip('File symlinks require Windows Developer Mode or symlink privileges.');
		return;
	}
	assert.equal((await request('/page.html')).status, 404);
	fs.symlinkSync(path.join(root, 'secret.php'), path.join(root, '404.html'), 'file');
	const response = await request('/missing');
	assert.equal(response.status, 404);
	assert.doesNotMatch(response.body, /PHP SECRET/);
});
