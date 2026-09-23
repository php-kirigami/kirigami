import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createConnection, createServer } from 'node:net';
import { createSocket } from 'node:dgram';
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

test('a network runtime relays UDP datagrams (streams and the sockets extension)', { timeout: 30000 }, async (t) => {
	const echo = createSocket('udp4');
	const received = [];
	echo.on('message', (msg, peer) => {
		received.push(msg.toString());
		echo.send(Buffer.from(`echo:${msg}`), peer.port, peer.address);
	});
	echo.bind(0, '127.0.0.1');
	await once(echo, 'listening');
	t.after(() => echo.close());
	const port = echo.address().port;
	const php = await createPHPRuntime({ network: true });
	t.after(() => php.exit());
	const { text } = await php.run({ code: `<?php
		$s = stream_socket_client('udp://127.0.0.1:${port}', $errno, $errstr, 5);
		stream_set_timeout($s, 5);
		fwrite($s, 'one'); $a = fread($s, 100);
		fwrite($s, 'two'); $b = fread($s, 100);
		fclose($s);
		// The sockets extension reads without waiting: poll with MSG_DONTWAIT.
		$sock = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
		socket_sendto($sock, 'three', 5, 0, '127.0.0.1', ${port});
		$c = false;
		for ($i = 0; $i < 300 && $c === false; $i++) {
			$n = @socket_recvfrom($sock, $c, 100, MSG_DONTWAIT, $from, $fromPort);
			if ($n === false) { $c = false; usleep(10000); }
		}
		echo json_encode([$a, $b, $c]);
	` });
	assert.deepEqual(JSON.parse(text), ['echo:one', 'echo:two', 'echo:three']);
	assert.deepEqual(received, ['one', 'two', 'three']);
});

test('the proxy only opens a TCP relay once the destination accepts', { timeout: 30000 }, async (t) => {
	// A port nobody listens on: bind, read the port, close.
	const probe = createServer();
	probe.listen(0, '127.0.0.1');
	await once(probe, 'listening');
	const closedPort = probe.address().port;
	probe.close();
	await once(probe, 'close');
	// A server that talks first and closes, before the client sends anything.
	const talker = createServer(socket => socket.end(['HTTP/1.0 200 OK', 'Content-Length: 2', '', 'ok'].join('\r\n')));
	talker.listen(0, '127.0.0.1');
	await once(talker, 'listening');
	t.after(() => talker.close());
	const php = await createPHPRuntime({ network: true });
	t.after(() => php.exit());
	const { text } = await php.run({ code: `<?php
		$refused = curl_init('http://127.0.0.1:${closedPort}/');
		curl_setopt($refused, CURLOPT_RETURNTRANSFER, true);
		curl_exec($refused);
		$talker = curl_init('http://127.0.0.1:${talker.address().port}/');
		curl_setopt($talker, CURLOPT_RETURNTRANSFER, true);
		echo json_encode([curl_errno($refused), curl_exec($talker)]);
	` });
	// 7 = CURLE_COULDNT_CONNECT: the 502 handshake fails the connect instead
	// of an open-then-closed socket (52, "Empty reply from server").
	assert.deepEqual(JSON.parse(text), [7, 'ok']);
});

