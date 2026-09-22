import assert from 'node:assert/strict';
import fs from 'node:fs';
import https from 'node:https';
import { once } from 'node:events';
import { rootCertificates } from 'node:tls';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';
import { exec, getPHPRuntimeWithNetwork } from '@kirigami/php-wasm';

test('CURL authenticates TLS peers and hostnames; WASM receives the Node CA bundle', { timeout: 60000 }, async t => {
	const runPhp = promisify(execFile);
	const phpBinary = process.env.PHP_BINARY || 'php';
	const extension = await runPhp(phpBinary, ['-r', 'echo extension_loaded("curl") ? "1" : "0";']);
	const phpArgs = extension.stdout === '1' ? [] : ['-d', 'extension=curl'];
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'kirigami-tls-'));
	t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
	// Generate a short-lived test identity in memory; no real credentials or
	// external network services are needed for this regression test.
	const generated = await exec(`
file_put_contents('/tmp/tls-test.cnf', "[req]\ndistinguished_name=dn\nx509_extensions=ext\n[dn]\n[ext]\nsubjectAltName=IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\n");
$options = ['config' => '/tmp/tls-test.cnf', 'private_key_bits' => 2048, 'digest_alg' => 'sha256'];
$key = openssl_pkey_new($options);
$csr = openssl_csr_new(['commonName' => '127.0.0.1'], $key, $options);
$cert = openssl_csr_sign($csr, null, $key, 1, $options);
openssl_x509_export($cert, $pem);
openssl_pkey_export($key, $private, null, $options);
echo json_encode(['cert' => $pem, 'key' => $private]);
`);
	assert.equal(generated.returnCode, 0, generated.stderr);
	const identity = JSON.parse(generated.stdout);
	const server = https.createServer(identity, (req, res) => {
		if (req.url === '/redirect') {
			res.writeHead(302, { Location: `https://localhost:${server.address().port}/` }).end();
		} else res.writeHead(200, { 'Content-Type': 'text/plain' }).end('verified');
	});
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
	const php = await getPHPRuntimeWithNetwork();
	const proxySockets = new Set();
	php._networkProxyServer.on('connection', socket => {
		proxySockets.add(socket);
		socket.on('close', () => proxySockets.delete(socket));
	});
	t.after(() => {
		for (const socket of proxySockets) socket.destroy();
		return new Promise(resolve => php._networkProxyServer.close(resolve));
	});
	const caPath = '/internal/shared/ca-bundle.crt';
	const roots = rootCertificates.join('\n');
	assert.equal(php.readFileAsText(caPath), roots);
	const settings = await exec('echo json_encode([ini_get("curl.cainfo"), ini_get("openssl.cafile")]);', true);
	assert.deepEqual(JSON.parse(settings.stdout), [caPath, caPath]);
	const localCa = path.join(directory, 'ca.pem');
	fs.writeFileSync(localCa, roots);
	const helperPath = path.join(directory, 'curl.php');
	// Only relocate the WASM-specific cookie path for the native PHP fixture.
	// The actual TLS options and helper control flow remain unchanged.
	fs.writeFileSync(helperPath, fs.readFileSync(new URL('../src/libraries/curl.class.php', import.meta.url), 'utf8').replace('/project/.cookie.txt', path.join(directory, 'cookies.txt').replaceAll('\\', '/')));
	const request = async (host, route = '/') => {
		const url = `https://${host}:${server.address().port}${route}`;
		const script = path.join(directory, 'request.php');
		fs.writeFileSync(script, `<?php
class PREPROS { public static $config; public static function exportFile($path) {} }
class STR { public static function is_url($url) { return filter_var($url, FILTER_VALIDATE_URL) !== false; } }
PREPROS::$config = (object)['network' => true];
require ${JSON.stringify(helperPath.replaceAll('\\', '/'))};
$url = ${JSON.stringify(url)};
echo json_encode(['info' => CURL::getInfo($url), 'body' => CURL::getContents($url), 'download' => CURL::getContents($url, ${JSON.stringify(path.join(directory, 'download.txt').replaceAll('\\', '/'))})]);
`);
		const result = await runPhp(phpBinary, [...phpArgs, '-d', `curl.cainfo=${localCa}`, script], { timeout: 15000 });
		return JSON.parse(result.stdout);
	};
	// A self-signed server must fail with the unmodified production trust store.
	let response = await request('127.0.0.1');
	assert.equal(response.info, false);
	assert.equal(response.body, false);
	assert.equal(response.download, false);
	fs.writeFileSync(localCa, roots + '\n' + identity.cert);
	response = await request('127.0.0.1');
	assert.equal(response.info.http_code, 200);
	assert.equal(response.body, 'verified');
	assert.equal(response.download, true);
	assert.equal(fs.readFileSync(path.join(directory, 'download.txt'), 'utf8'), 'verified');
	// Trusting the certificate must not bypass its subjectAltName restriction,
	// including when the invalid hostname is reached through a redirect.
	for (const [host, route] of [['localhost', '/'], ['127.0.0.1', '/redirect']]) {
		response = await request(host, route);
		assert.equal(response.info, false);
		assert.equal(response.body, false);
		assert.equal(response.download, false);
	}

	// The same helper, end to end inside the WASM runtime: requests reach the
	// proxy (libcurl's poll() must yield to Node) and TLS is verified against
	// the injected CA bundle.
	php.mkdirTree('/project');
	php.writeFile('/tmp/curl.class.php', fs.readFileSync(new URL('../src/libraries/curl.class.php', import.meta.url), 'utf8'));
	const requestWasm = async (host, route = '/') => {
		const url = `https://${host}:${server.address().port}${route}`;
		const result = await exec(`
class PREPROS { public static $config; public static function exportFile($path) {} }
class STR { public static function is_url($url) { return filter_var($url, FILTER_VALIDATE_URL) !== false; } }
PREPROS::$config = (object)['network' => true];
require '/tmp/curl.class.php';
$url = ${JSON.stringify(url)};
echo json_encode(['info' => CURL::getInfo($url), 'body' => CURL::getContents($url), 'download' => CURL::getContents($url, '/tmp/download.txt')]);
`, true);
		assert.equal(result.returnCode, 0, result.stderr);
		return JSON.parse(result.stdout);
	};
	php.writeFile(caPath, roots);
	response = await requestWasm('127.0.0.1');
	assert.equal(response.info, false);
	assert.equal(response.body, false);
	php.writeFile(caPath, roots + '\n' + identity.cert);
	response = await requestWasm('127.0.0.1');
	assert.equal(response.info.http_code, 200);
	assert.equal(response.body, 'verified');
	assert.equal(response.download, true);
	assert.equal(php.readFileAsText('/tmp/download.txt'), 'verified');
	for (const [host, route] of [['localhost', '/'], ['127.0.0.1', '/redirect']]) {
		response = await requestWasm(host, route);
		assert.equal(response.info, false);
		assert.equal(response.body, false);
		assert.equal(response.download, false);
	}
	php.writeFile(caPath, roots);
});
