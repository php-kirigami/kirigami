import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createConnection, createServer } from 'node:net';
import { test } from 'node:test';
import { createPHPRuntime, getPHPRuntime } from '../index.js';

test('owned runtimes do not reuse or dispose the shared runtime', async () => {
	const shared = await getPHPRuntime();
	shared.writeFile('/tmp/shared.txt', 'keep');
	for (let i = 0; i < 2; i++) {
		const php = await createPHPRuntime();
		try {
			assert.notEqual(php, shared);
			assert.equal(php.fileExists('/tmp/shared.txt'), false);
			php.setIniValues({ memory_limit: '128M' });
			const result = await php.run({ code: '<?php echo ini_get("memory_limit");' });
			assert.equal(result.text, '128M');
		} finally {
			php.exit();
		}
	}
	assert.equal(shared.readFileAsText('/tmp/shared.txt'), 'keep');
	assert.equal((await shared.run({ code: '<?php echo "alive";' })).text, 'alive');
	shared.unlink('/tmp/shared.txt');
});

test('exiting a network runtime closes its proxy, upgraded sockets and outbound connections', { timeout: 15000 }, async (t) => {
	const destination = createServer();
	destination.listen(0, '127.0.0.1');
	await once(destination, 'listening');
	t.after(() => destination.close());
	const php = await createPHPRuntime({ network: true });
	t.after(() => php.exit());
	const proxy = php._networkProxyServer;
	assert.equal(proxy.listening, true);
	const accepted = once(destination, 'connection');
	const client = createConnection(proxy.address().port, '127.0.0.1');
	t.after(() => client.destroy());
	await once(client, 'connect');
	client.write(`GET /?host=127.0.0.1&port=${destination.address().port} HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`);
	client.resume();
	const [outbound] = await accepted;
	t.after(() => outbound.destroy());
	outbound.resume();
	const closed = Promise.all([once(proxy, 'close'), once(client, 'close'), once(outbound, 'close')]);
	php.exit();
	await closed;
	assert.equal(proxy.listening, false);
});
