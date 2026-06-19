/**
 * runtime.js — PHP WASM runtime avec networking
 *
 * Zéro dépendance externe : node:http, node:net, node:crypto, node:tls, node:dns
 *
 * Architecture du networking :
 *   PHP (WASM/SOCKFS)
 *     └─ ws (hardcodé par Emscripten, lib externe)
 *         └─ decorator → PHPWasmWebSocket (framing COMMAND_CHUNK / COMMAND_SET_SOCKETOPT)
 *             └─ WS vers ws://127.0.0.1:<proxyPort>/?host=X&port=Y
 *                 └─ Proxy HTTP/WS natif (node:http upgrade)
 *                     └─ TCP vers la vraie destination
 */

import { PHP, loadPHPRuntime } from '@php-wasm/universal';
import { createServer }        from 'node:http';
import { createConnection, isIP } from 'node:net';
import { lookup }              from 'node:dns';
import { createHash }          from 'node:crypto';
import { rootCertificates }    from 'node:tls';

// ─── CA bundle ───────────────────────────────────────────────────────────────

const CA_BUNDLE_PATH = '/internal/shared/ca-bundle.crt';
const PHP_INI_PATH   = '/internal/shared/php.ini';

function injectCaBundle(php) {
    php.writeFile(CA_BUNDLE_PATH, rootCertificates.join('\n'));
    let ini = '';
    try { ini = php.readFileAsText(PHP_INI_PATH); } catch {}
    ini = ini.split('\n')
        .filter(l => !/^\s*(openssl\.cafile|curl\.cainfo)\s*=/i.test(l))
        .join('\n');
    ini += `\nopenssl.cafile=${CA_BUNDLE_PATH}\ncurl.cainfo=${CA_BUNDLE_PATH}\n`;
    php.writeFile(PHP_INI_PATH, ini);
}

// ─── Protocol de framing SOCKFS ──────────────────────────────────────────────
// Emscripten envoie chaque message WebSocket préfixé d'un octet de commande.
//   1 = COMMAND_CHUNK        → données TCP brutes (octets 1..n)
//   2 = COMMAND_SET_SOCKETOPT → [optClass, optName, optValue]

const COMMAND_CHUNK         = 1;
const COMMAND_SET_SOCKETOPT = 2;

function prependByte(chunk, byte) {
    const src = chunk instanceof ArrayBuffer
        ? new Uint8Array(chunk)
        : ArrayBuffer.isView(chunk)
            ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
            : Buffer.from(chunk);
    const buf = new Uint8Array(src.length + 1);
    buf[0] = byte;
    buf.set(src, 1);
    return buf.buffer;
}

// Decorator attendu par SOCKFS : wrape le constructeur WebSocket (lib `ws`)
// pour que send() préfixe COMMAND_CHUNK et expose setSocketOpt().
function addSocketOptionsSupportToWebSocketClass(WsConstructor) {
    return class PHPWasmWebSocket extends WsConstructor {
        send(chunk, callback) {
            return this.#cmd(COMMAND_CHUNK, chunk, callback);
        }
        setSocketOpt(optClass, optName, optVal) {
            return this.#cmd(
                COMMAND_SET_SOCKETOPT,
                new Uint8Array([optClass, optName, optVal]).buffer,
                () => {}
            );
        }
        #cmd(type, chunk, cb) {
            return WsConstructor.prototype.send.call(this, prependByte(chunk, type), cb);
        }
    };
}

// ─── Proxy WebSocket → TCP (natif node:http, zéro dépendance) ────────────────

function wsHandshakeResponse(key) {
    const accept = createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
    return [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Accept: ${accept}`,
        'Sec-WebSocket-Protocol: binary',
        '\r\n',
    ].join('\r\n');
}

// Encode un message WebSocket binaire (frame non masquée, opcode 0x2)
function wsFrame(data) {
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.from([0x82, len]);
    } else if (len < 65536) {
        header = Buffer.allocUnsafe(4);
        header[0] = 0x82; header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.allocUnsafe(10);
        header[0] = 0x82; header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

// Parse les frames WebSocket depuis un Buffer, retourne { frames, remaining }
function parseFrames(buf) {
    const frames = [];
    let offset = 0;
    while (offset + 2 <= buf.length) {
        const masked     = !!(buf[offset + 1] & 0x80);
        let payloadLen   = buf[offset + 1] & 0x7f;
        let headerLen    = 2 + (masked ? 4 : 0);
        if (payloadLen === 126) headerLen += 2;
        else if (payloadLen === 127) headerLen += 8;
        if (offset + headerLen > buf.length) break;
        if (payloadLen === 126) payloadLen = buf.readUInt16BE(offset + 2);
        else if (payloadLen === 127) payloadLen = Number(buf.readBigUInt64BE(offset + 2));
        if (offset + headerLen + payloadLen > buf.length) break;
        let payload = buf.slice(offset + headerLen, offset + headerLen + payloadLen);
        if (masked) {
            const mask = buf.slice(offset + headerLen - 4, offset + headerLen);
            payload = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
        }
        frames.push({ opcode: buf[offset] & 0x0f, payload });
        offset += headerLen + payloadLen;
    }
    return { frames, remaining: buf.slice(offset) };
}

function lookupIPv4(hostname) {
    return new Promise((resolve, reject) =>
        lookup(hostname, { family: 4 }, (err, addr) => err ? reject(err) : resolve(addr))
    );
}

function startOutboundProxy(port) {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            res.writeHead(403).end('Only WebSocket connections accepted.\n');
        });

        server.on('upgrade', async (request, socket, head) => {
            // console.error(`[proxy] upgrade: ${request.url}`);
            // Handshake WebSocket
            const key = request.headers['sec-websocket-key'];
            if (!key) { socket.destroy(); return; }
            socket.write(wsHandshakeResponse(key));

            // Extraire host/port depuis ?host=X&port=Y
            const url       = new URL(`ws://0.0.0.0${request.url}`);
            const destPort  = Number(url.searchParams.get('port'));
            const destHost  = url.searchParams.get('host');
            // console.error(`[proxy] → ${destHost}:${destPort}`);
            if (!destHost || !destPort || destPort < 1 || destPort > 65535) {
                socket.destroy(); return;
            }

            // Résolution DNS
            let destIp = destHost;
            if (isIP(destHost) === 0) {
                try   { destIp = await lookupIPv4(destHost); }
                catch { socket.destroy(); return; }
            }

            let wsBuffer = head.length ? head : Buffer.alloc(0);
            const recvQueue = [];
            let tcpSocket   = null;

            function flush() {
                while (recvQueue.length > 0) {
                    const msg         = recvQueue.pop();
                    const commandType = msg[0];
                    if (commandType === COMMAND_CHUNK) {
                        tcpSocket.write(msg.slice(1));
                    } else if (commandType === COMMAND_SET_SOCKETOPT) {
                        const SOL_SOCKET  = 1, SO_KEEPALIVE = 9;
                        const IPPROTO_TCP = 6, TCP_NODELAY  = 1;
                        if (msg[1] === SOL_SOCKET  && msg[2] === SO_KEEPALIVE) tcpSocket.setKeepAlive(msg[3]);
                        if (msg[1] === IPPROTO_TCP && msg[2] === TCP_NODELAY)  tcpSocket.setNoDelay(msg[3]);
                    }
                }
            }

            socket.on('data', (chunk) => {
                wsBuffer = Buffer.concat([wsBuffer, chunk]);
                const { frames, remaining } = parseFrames(wsBuffer);
                wsBuffer = remaining;
                for (const { opcode, payload } of frames) {
                    // console.error(`[proxy] WS frame opcode=0x${opcode.toString(16)} payload=${payload.length}b cmd=${payload[0]}`);
                    if (opcode === 0x8) { socket.destroy(); return; } // close
                    if (opcode === 0x2 || opcode === 0x0) {           // binary/continuation
                        recvQueue.unshift(payload);
                        if (tcpSocket) flush();
                    }
                }
            });

            socket.on('close', () => tcpSocket?.end());
            socket.on('error', () => tcpSocket?.end());

            tcpSocket = createConnection(destPort, destIp, () => {
                // console.error(`[proxy] TCP connecté → ${destIp}:${destPort}`);
                flush();
            });
            tcpSocket.on('data',  (data) => {
                // console.error(`[proxy] TCP→WS ${data.length} bytes`);
                try { socket.write(wsFrame(data)); } catch { tcpSocket.end(); }
            });
            tcpSocket.on('end',   ()     => socket.destroy());
            tcpSocket.on('error', ()     => { socket.destroy(); try { tcpSocket.end(); } catch {} });
        });

        server.listen(port, '127.0.0.1', () => {
            // unref() : le serveur ne maintient pas l'event loop active.
            // Le processus peut se terminer normalement quand tout le travail
            // PHP est fini, sans avoir à fermer le proxy explicitement.
            server.unref();
            resolve(server);
        });
    });
}

// ─── Port libre ──────────────────────────────────────────────────────────────

function getFreePort() {
    return new Promise((resolve) => {
        const s = createServer();
        s.listen(0, '127.0.0.1', () => {
            const { port } = s.address();
            s.close(() => resolve(port));
        });
    });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

const getPHPRuntime = async () => {
    const runtime = await loadPHPRuntime(await import('../jspi/php_8_5.js'));
    return new PHP(runtime);
};

const getPHPRuntimeWithNetwork = async () => {
    const proxyPort  = await getFreePort();
    const httpServer = await startOutboundProxy(proxyPort);

    const runtime = await loadPHPRuntime(
        await import('../jspi/php_8_5.js'),
        {
            websocket: {
                url: (_sock, host, port) =>
                    `ws://127.0.0.1:${proxyPort}/?host=${host}&port=${port}`,
                subprotocol: 'binary',
                decorator:   addSocketOptionsSupportToWebSocketClass,
            },
        }
    );

    const php = new PHP(runtime);
    injectCaBundle(php);

    // Référence pour arrêt propre si nécessaire : php._networkProxyServer.close()
    php._networkProxyServer = httpServer;

    return php;
};

export { getPHPRuntime, getPHPRuntimeWithNetwork };
