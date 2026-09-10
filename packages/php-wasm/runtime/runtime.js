/**
 * runtime.js — PHP WASM runtime with networking
 *
 * Zero external dependency: node:http, node:net, node:crypto, node:tls, node:dns
 *
 * Networking architecture:
 *   PHP (WASM/SOCKFS)
 *     └─ ws (hardcoded by Emscripten, external lib)
 *         └─ decorator → PHPWasmWebSocket (framing COMMAND_CHUNK / COMMAND_SET_SOCKETOPT)
 *             └─ WS to ws://127.0.0.1:<proxyPort>/?host=X&port=Y
 *                 └─ Native HTTP/WS proxy (node:http upgrade)
 *                     └─ TCP to the real destination
 */

import { PHP, loadPHPRuntime }    from '@php-wasm/universal';
import { createServer }           from 'node:http';
import { createConnection, isIP } from 'node:net';
import { lookup }                 from 'node:dns';
import { createHash }             from 'node:crypto';
import { rootCertificates }       from 'node:tls';

// ─── CA bundle ───────────────────────────────────────────────────────────────

const CA_BUNDLE_PATH = '/internal/shared/ca-bundle.crt';
const PHP_INI_PATH   = '/internal/shared/php.ini';

function injectCaBundle(php) {
    php.writeFile(CA_BUNDLE_PATH, rootCertificates.join('\n'));
    setPhpIniValues(php, {
        'openssl.cafile': CA_BUNDLE_PATH,
        'curl.cainfo':    CA_BUNDLE_PATH,
    });
}

// ─── php.ini: reading / writing directives ──────────────────────────────────
// Lets you change an existing directive (whatever its current value) or add it
// if it doesn't exist yet. Works on `directive = value` pairs outside of
// [section] sections (the standard php.ini use case for openssl.*, curl.*,
// memory_limit, upload_max_filesize, etc.)

function readPhpIni(php, iniPath = PHP_INI_PATH) {
    try { return php.readFileAsText(iniPath); } catch { return ''; }
}

// Returns a directive's current value (string) or undefined if absent.
// Commented-out lines (`;directive = ...`) are ignored.
function getPhpIniValue(php, key, iniPath = PHP_INI_PATH) {
    const ini = readPhpIni(php, iniPath);
    const re  = new RegExp(`^\\s*${key.replace(/\./g, '\\.')}\\s*=\\s*(.*)$`, 'im');
    const match = ini.split('\n').find(l => re.test(l) && !/^\s*;/.test(l));
    if (!match) return undefined;
    return match.match(re)[1].trim();
}

// Updates or adds one or more directives in the VM's php.ini.
// `values`: object { 'directive.name': value, ... }.
// Any existing active line for the same directive is removed and replaced by a
// new line at the end of the file (comments and other directives are
// preserved).
function setPhpIniValues(php, values, iniPath = PHP_INI_PATH) {
    const keys = Object.keys(values).map(k => k.toLowerCase());
    let ini = readPhpIni(php, iniPath);

    const lines = ini.split('\n').filter(l => {
        const m = l.match(/^\s*([A-Za-z0-9_.]+)\s*=/);
        if (!m) return true; // comments, sections, blank lines: keep them
        return !keys.includes(m[1].toLowerCase());
    });

    // Clean up any trailing blank lines before appending
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();

    for (const [key, value] of Object.entries(values)) {
        lines.push(`${key}=${value}`);
    }

    php.writeFile(iniPath, lines.join('\n') + '\n');
}

// ─── SOCKFS framing protocol ────────────────────────────────────────────────
// Emscripten sends each WebSocket message prefixed with a command byte.
//   1 = COMMAND_CHUNK        → raw TCP data (bytes 1..n)
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

// Decorator expected by SOCKFS: wraps the WebSocket constructor (the `ws` lib)
// so that send() prefixes COMMAND_CHUNK and exposes setSocketOpt().
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

// ─── WebSocket → TCP proxy (native node:http, zero dependency) ───────────────

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

// Encodes a binary WebSocket message (unmasked frame, opcode 0x2)
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

// Parses WebSocket frames from a Buffer, returns { frames, remaining }
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
            // WebSocket handshake
            const key = request.headers['sec-websocket-key'];
            if (!key) { socket.destroy(); return; }
            socket.write(wsHandshakeResponse(key));

            // Extract host/port from ?host=X&port=Y
            const url       = new URL(`ws://0.0.0.0${request.url}`);
            const destPort  = Number(url.searchParams.get('port'));
            const destHost  = url.searchParams.get('host');
            // console.error(`[proxy] → ${destHost}:${destPort}`);
            if (!destHost || !destPort || destPort < 1 || destPort > 65535) {
                socket.destroy(); return;
            }

            // DNS resolution
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
                // console.error(`[proxy] TCP connected → ${destIp}:${destPort}`);
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
            // unref(): the server doesn't keep the event loop alive.
            // The process can exit normally once all the PHP work is done,
            // without having to close the proxy explicitly.
            server.unref();
            resolve(server);
        });
    });
}

// ─── Free port ─────────────────────────────────────────────────────────────

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

    // Reference for a clean shutdown if needed: php._networkProxyServer.close()
    php._networkProxyServer = httpServer;

    return php;
};

export { getPHPRuntime, getPHPRuntimeWithNetwork, setPhpIniValues, getPhpIniValue };