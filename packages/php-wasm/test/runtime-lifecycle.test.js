import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createConnection, createServer, Socket } from 'node:net';
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
	// "wait:<ms>:<text>" answers after <ms>, so PHP has to wait for it.
	echo.on('message', (msg, peer) => {
		received.push(msg.toString());
		const delayed = /^wait:(\d+):(.*)$/s.exec(msg.toString());
		const reply = () => echo.send(Buffer.from(`echo:${delayed ? delayed[2] : msg}`), peer.port, peer.address);
		if (delayed) setTimeout(reply, Number(delayed[1]));
		else reply();
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
		// A blocking recvfrom waits for the delayed reply.
		$sock = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
		socket_sendto($sock, 'wait:200:three', 14, 0, '127.0.0.1', ${port});
		socket_recvfrom($sock, $c, 100, 0, $from, $fromPort);
		// select() reports the socket readable only once a datagram is queued.
		socket_sendto($sock, 'wait:200:four', 13, 0, '127.0.0.1', ${port});
		$r = [$sock]; $w = null; $e = null;
		$early = socket_select($r, $w, $e, 0, 0);
		$r = [$sock];
		$ready = socket_select($r, $w, $e, 5);
		socket_recvfrom($sock, $d, 100, 0, $from, $fromPort);
		// SO_RCVTIMEO bounds a blocking recvfrom: EAGAIN when nothing comes.
		socket_set_option($sock, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 0, 'usec' => 200000]);
		$timedOut = @socket_recvfrom($sock, $none, 100, 0, $from, $fromPort) === false
			&& socket_last_error($sock) === SOCKET_EAGAIN;
		echo json_encode([$a, $b, $c, $early, $ready, $d, $timedOut]);
	` });
	assert.deepEqual(JSON.parse(text), ['echo:one', 'echo:two', 'echo:three', 0, 1, 'echo:four', true]);
	assert.deepEqual(received, ['one', 'two', 'wait:200:three', 'wait:200:four']);
});

test('a UDP peer whose relay fails reports ECONNREFUSED once', { timeout: 30000 }, async (t) => {
	const php = await createPHPRuntime({ network: true });
	t.after(() => php.exit());
	// The proxy can't resolve the host and answers 502: the next read fails
	// with ECONNREFUSED, then later reads just time out, as on Linux.
	const { text } = await php.run({ code: `<?php
		$s = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
		socket_set_option($s, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 2, 'usec' => 0]);
		socket_sendto($s, 'x', 1, 0, 'no-such-host.invalid', 9999);
		$errors = [];
		for ($i = 0; $i < 2; $i++) {
			socket_clear_error($s);
			@socket_recvfrom($s, $buf, 100, 0, $from, $port);
			$errors[] = socket_last_error($s);
		}
		echo json_encode([$errors, SOCKET_ECONNREFUSED, SOCKET_EAGAIN]);
	` });
	const [errors, refused, again] = JSON.parse(text);
	assert.deepEqual(errors, [refused, again]);
});

test('the proxy only opens a TCP relay once the destination accepts', { timeout: 30000 }, async (t) => {
	// A port nobody listens on: bind, read the port, close.
	const probe = createServer();
	probe.listen(0, '127.0.0.1');
	await once(probe, 'listening');
	const closedPort = probe.address().port;
	probe.close();
	await once(probe, 'close');
	// Answers late, so a blocking read has to wait for it.
	const echo = createServer((c) => c.on('data', (d) => setTimeout(() => c.write(`echo:${d}`), 100)));
	echo.listen(0, '127.0.0.1');
	await once(echo, 'listening');
	t.after(() => echo.close());
	const openPort = echo.address().port;
	const php = await createPHPRuntime({ network: true });
	t.after(() => php.exit());
	const { text } = await php.run({ code: `<?php
		$refused = curl_init('http://127.0.0.1:${closedPort}/');
		curl_setopt($refused, CURLOPT_RETURNTRANSFER, true);
		curl_exec($refused);
		$out = ['curl' => curl_errno($refused)];
		// connect() waits for the relay and reports the refusal.
		$s = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		$out['blocking'] = @socket_connect($s, '127.0.0.1', ${closedPort}) ? 0 : socket_last_error($s);
		// A blocking read waits for the reply.
		$s = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		socket_connect($s, '127.0.0.1', ${openPort});
		socket_write($s, 'read');
		$out['read'] = socket_read($s, 100);
		// Non-blocking: EINPROGRESS, then writable once connected.
		$s = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		socket_set_nonblock($s);
		$out['nonblocking'] = @socket_connect($s, '127.0.0.1', ${openPort}) ? 0 : socket_last_error($s);
		$r = null; $w = [$s]; $e = null;
		$out['writable'] = socket_select($r, $w, $e, 5);
		// socket_set_block() undoes socket_set_nonblock(): the read waits.
		socket_set_block($s);
		socket_write($s, 'block');
		$out['blockAgain'] = socket_read($s, 100);
		// Stream equivalent, through STREAM_CLIENT_ASYNC_CONNECT.
		$flags = STREAM_CLIENT_CONNECT | STREAM_CLIENT_ASYNC_CONNECT;
		$stream = stream_socket_client('tcp://127.0.0.1:${openPort}', $errno, $errstr, 5, $flags);
		$r = null; $w = [$stream]; $e = null;
		stream_select($r, $w, $e, 5);
		stream_set_blocking($stream, true);
		fwrite($stream, 'async');
		$out['async'] = fread($stream, 100);
		echo json_encode([$out, SOCKET_ECONNREFUSED, SOCKET_EINPROGRESS]);
	` });
	const [out, refused, inProgress] = JSON.parse(text);
	// 7 = CURLE_COULDNT_CONNECT: the 502 handshake fails the connect instead
	// of an open-then-closed socket (52, "Empty reply from server").
	assert.deepEqual(out, { curl: 7, blocking: refused, read: 'echo:read', nonblocking: inProgress, writable: 1, blockAgain: 'echo:block', async: 'echo:async' });
});

test('the proxy applies TCP_NODELAY and SO_KEEPALIVE set before or after connect', { timeout: 30000 }, async (t) => {
	const echo = createServer((c) => c.on('data', (d) => c.write(`echo:${d}`)));
	echo.listen(0, '127.0.0.1');
	await once(echo, 'listening');
	t.after(() => echo.close());
	const port = echo.address().port;
	// Record what the proxy applies to its outbound sockets to the echo server.
	const applied = [];
	for (const name of ['setNoDelay', 'setKeepAlive']) {
		const original = Socket.prototype[name];
		t.mock.method(Socket.prototype, name, function (...args) {
			if (this.remotePort === port) applied.push(`${name}(${args[0]})`);
			return original.apply(this, args);
		});
	}
	const php = await createPHPRuntime({ network: true });
	t.after(() => php.exit());
	const { text } = await php.run({ code: `<?php
		// Before connect: remembered, then sent once the relay opens.
		$s = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
		socket_set_option($s, SOL_TCP, TCP_NODELAY, 1);
		socket_set_option($s, SOL_SOCKET, SO_KEEPALIVE, 1);
		socket_connect($s, '127.0.0.1', ${port});
		socket_write($s, 'a'); socket_read($s, 100);
		// After connect: sent right away, 0 included.
		socket_set_option($s, SOL_TCP, TCP_NODELAY, 0);
		socket_write($s, 'b'); socket_read($s, 100);
		$read = [socket_get_option($s, SOL_TCP, TCP_NODELAY), socket_get_option($s, SOL_SOCKET, SO_KEEPALIVE)];
		$unsupported = @socket_set_option($s, SOL_SOCKET, SO_REUSEADDR, 1) === false
			&& socket_last_error($s) === SOCKET_ENOPROTOOPT;
		echo json_encode([$read, $unsupported]);
	` });
	assert.deepEqual(JSON.parse(text), [[0, 1], true]);
	assert.deepEqual(applied, ['setNoDelay(1)', 'setKeepAlive(1)', 'setNoDelay(0)']);
});
