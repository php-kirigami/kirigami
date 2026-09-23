/**
 * runtime.js — PHP WASM runtime with networking
 *
 * Zero external dependency: node:http, node:net, node:dgram, node:crypto, node:tls, node:dns
 *
 * Networking architecture:
 *   PHP (WASM/SOCKFS)
 *     └─ ws (hardcoded by Emscripten, external lib)
 *         └─ decorator → PHPWasmWebSocket (framing COMMAND_CHUNK / COMMAND_SET_SOCKETOPT)
 *             └─ WS to ws://127.0.0.1:<proxyPort>/?host=X&port=Y[&proto=udp]
 *                 └─ Native HTTP/WS proxy (node:http upgrade)
 *                     └─ TCP to the real destination, or UDP (node:dgram)
 *                        for a SOCK_DGRAM socket: one message per datagram
 */

import { PHP, loadPHPRuntime, resolvePHPExtension, withResolvedPHPExtensions } from '@php-wasm/universal';
import { createServer }           from 'node:http';
import { createConnection, isIP } from 'node:net';
import { createSocket as createDgramSocket } from 'node:dgram';
import { lookup }                 from 'node:dns';
import { createHash }             from 'node:crypto';
import { rootCertificates }       from 'node:tls';
import { homedir }                from 'node:os';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL }          from 'node:url';

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

// ─── Auto-discovered PHP extensions ─────────────────────────────────────────

function safeReadDir(dir) {
    try { return readdirSync(dir, { withFileTypes: true }); }
    catch { return []; }
}

function isDirectory(path) {
    try { return statSync(path).isDirectory(); }
    catch { return false; }
}

function addPackageDirs(dir, seen) {
    if (!dir || !existsSync(dir)) return;

    for (const entry of safeReadDir(dir)) {
        const childPath = join(dir, entry.name);
        // npm link and workspaces install packages as symlinks (junctions on Windows).
        if (!entry.isDirectory() && !(entry.isSymbolicLink() && isDirectory(childPath))) continue;

        if (entry.name.startsWith('phpext-')) {
            seen.add(childPath);
            continue;
        }

        if (entry.name === '@kirigami') {
            addPackageDirs(childPath, seen);
        }
    }
}

function discoverPHPExtensionPackageDirs() {
    const seen = new Set();
    if (discoveryMode() === 'off') return [];
    const roots = new Set();
    let current = resolve(process.cwd());

    while (true) {
        roots.add(current);
        const parent = dirname(current);
        if (parent === current) break;
        current = parent;
    }

    for (const root of roots) {
        addPackageDirs(join(root, 'node_modules'), seen);
        addPackageDirs(join(root, 'packages'), seen);
    }

    if (discoveryMode() === 'all') {
        try {
            const globalRoot = npmGlobalRoot();
            if (globalRoot) {
                addPackageDirs(globalRoot, seen);
                addPackageDirs(join(globalRoot, '@kirigami'), seen);
            }
        } catch {
            // Ignore missing global npm or a no-node-install environment.
        }
    }

    return [...seen];
}

// KIRIGAMI_PHPEXT_DISCOVERY: "all" (default) searches local and global
// packages, "local" skips the global npm root, "off" disables discovery.
// Tests use "off" so results don't depend on what the machine has installed.
function discoveryMode() {
    const mode = String(process.env.KIRIGAMI_PHPEXT_DISCOVERY || 'all').toLowerCase();
    return ['off', 'local'].includes(mode) ? mode : 'all';
}

// npm's global root, computed the way npm resolves its global prefix
// (npm_config_prefix, then `prefix=` in ~/.npmrc, then the default next to
// the Node executable) instead of spawning `npm root -g`: spawning npm costs
// ~0.6 s per process and cannot run npm.cmd without a shell on Windows.
// Values set only in a global or builtin npmrc are not read.
function npmGlobalRoot() {
    const prefix = npmGlobalPrefix();
    return process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib', 'node_modules');
}

function npmGlobalPrefix() {
    const fromEnv = process.env.npm_config_prefix || process.env.NPM_CONFIG_PREFIX;
    if (fromEnv) return resolve(fromEnv);
    try {
        const npmrc = readFileSync(join(homedir(), '.npmrc'), 'utf8');
        const match = npmrc.match(/^\s*prefix\s*=\s*(.+?)\s*$/m);
        if (match) return resolve(match[1].replace(/^["']|["']$/g, '').replace(/^~(?=$|[\/])/, homedir()));
    } catch {
        // No user npmrc.
    }
    return process.platform === 'win32' ? dirname(process.execPath) : dirname(dirname(process.execPath));
}

function pickExtensionArtifact(manifest, packageDir, phpMajorMinor) {
    if (!manifest || !Array.isArray(manifest.artifacts)) {
        return null;
    }

    if (!phpMajorMinor) phpMajorMinor = '';
    const versionCandidates = phpMajorMinor ? [phpMajorMinor, `${phpMajorMinor}.0`] : [];
    for (const candidate of versionCandidates) {
        const match = manifest.artifacts.find((artifact) => artifact && artifact.phpVersion === candidate);
        if (match && match.sourcePath) return join(packageDir, match.sourcePath);
    }

    const fallback = manifest.artifacts.find((artifact) => artifact && artifact.phpVersion && phpMajorMinor && String(artifact.phpVersion).startsWith(`${phpMajorMinor}.`));
    if (fallback && fallback.sourcePath) return join(packageDir, fallback.sourcePath);

    const generic = manifest.artifacts.find((artifact) => artifact && artifact.sourcePath);
    if (generic) return join(packageDir, generic.sourcePath);

    return null;
}

function findExtensionSoFile(packageDir, phpMajorMinor) {
    const manifestPath = join(packageDir, 'manifest.json');
    if (existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            const artifactPath = pickExtensionArtifact(manifest, packageDir, phpMajorMinor);
            if (artifactPath && existsSync(artifactPath)) return artifactPath;
        } catch {
            // Fall back to a direct directory walk below.
        }
    }

    let match = null;
    function walk(dir) {
        if (match) return;
        for (const entry of safeReadDir(dir)) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
                if (match) return;
                continue;
            }
            if (entry.name.endsWith('.so')) {
                match = fullPath;
                return;
            }
        }
    }
    walk(packageDir);
    return match;
}

// The modules a package ships, in load order. Generated phpext packages export
// `register(phpVersion)` from index.js, returning `[{ name, soPath, iniEntries? }]`;
// a package can bundle a dependency module first (phpext-mysqli ships mysqlnd,
// then mysqli), and `iniEntries` are php.ini settings the module needs (FFI
// loads but stays unusable without its own). Packages without it fall back to
// their single manifest.json.
async function listPackageModules(packageDir, phpMajorMinor) {
    const indexPath = join(packageDir, 'index.js');
    if (phpMajorMinor && existsSync(indexPath)) {
        try {
            const { default: register } = await import(pathToFileURL(indexPath).href);
            if (typeof register === 'function') {
                const modules = register(phpMajorMinor);
                if (Array.isArray(modules) && modules.every((m) => m && m.name && m.soPath && existsSync(m.soPath))) {
                    return modules;
                }
            }
        } catch {
            // Fall back to manifest.json below.
        }
    }

    const soPath = findExtensionSoFile(packageDir, phpMajorMinor);
    if (!soPath) return [];
    let manifest = null;
    try {
        manifest = JSON.parse(readFileSync(join(packageDir, 'manifest.json'), 'utf8'));
    } catch {
        manifest = null;
    }
    const name = (manifest && manifest.name) || packageDir.split(/[\\/]/).at(-1).replace(/^phpext-/, '');
    return [{ name, soPath, iniEntries: manifest && manifest.iniEntries }];
}

async function resolveInstalledPHPExtensions(phpMajorMinor) {
    const modules = [];
    const names = new Set();

    for (const packageDir of discoverPHPExtensionPackageDirs()) {
        for (const module of await listPackageModules(packageDir, phpMajorMinor)) {
            // A shared dependency (mysqlnd, bundled by both phpext-mysqli and
            // phpext-pdo_mysql) is loaded once, at its first position.
            if (names.has(module.name)) continue;
            names.add(module.name);
            modules.push(module);
        }
    }

    const extensions = [];
    for (const [index, { name, soPath, iniEntries }] of modules.entries()) {
        const extension = await resolvePHPExtension({
            phpVersion: phpMajorMinor || undefined,
            name,
            source: { format: 'so', name, bytes: readFileSync(soPath) },
            loadWithIniDirective: 'extension',
            // Written as `key=value` lines after the `extension=` line.
            iniEntries: iniEntries && typeof iniEntries === 'object' ? iniEntries : undefined,
        });
        // PHP reads the scan directory's .ini files in alphabetical order, and
        // "mysqli.ini" sorts before "mysqlnd.ini": prefix each file with its
        // load position so dependencies load first.
        if (extension.iniPath) {
            const dir = extension.iniPath.slice(0, extension.iniPath.lastIndexOf('/') + 1);
            extension.iniPath = `${dir}${String(index).padStart(3, '0')}-${name}.ini`;
        }
        extensions.push(extension);
    }

    return extensions;
}

async function withDiscoveredPHPExtensions(options = {}, phpMajorMinor) {
    const extensions = await resolveInstalledPHPExtensions(phpMajorMinor);
    return extensions.length ? withResolvedPHPExtensions(options, extensions) : options;
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
        constructor(...args) {
            super(...args);
            // Wake yielding poll() calls as soon as the socket changes state.
            for (const event of ['open', 'message', 'close', 'error']) {
                this.on(event, notifySocketActivity);
            }
        }
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

// SOCKFS's "port" message: the first message on a bound SOCK_DGRAM socket
// announces its local port (ff ff ff ff 'p' 'o' 'r' 't' hi lo). It's
// bookkeeping between two SOCKFS ends, not a datagram to forward.
function isSockfsPortMessage(data) {
    return data.length === 10 && data[0] === 0xff && data[1] === 0xff && data[2] === 0xff && data[3] === 0xff
        && data.toString('latin1', 4, 8) === 'port';
}

// UDP relay for one SOCKFS peer: each WebSocket message (COMMAND_CHUNK) is
// one datagram to host:port, and each datagram back becomes one message.
function relayUdp(socket, wsBuffer, destIp, destPort, trackUdp) {
    const udp = createDgramSocket('udp4');
    trackUdp(udp);
    // Like the proxy server itself, don't keep the event loop alive.
    udp.unref();
    const pending = [];
    let connected = false;

    const send = (payload) => {
        if (payload[0] !== COMMAND_CHUNK) return; // socket options don't apply to UDP
        const data = payload.subarray(1);
        if (isSockfsPortMessage(data)) return;
        if (connected) udp.send(data);
        else pending.push(data);
    };
    const close = () => {
        try { udp.close(); } catch { /* already closed */ }
        socket.destroy();
    };
    const onFrames = () => {
        const { frames, remaining } = parseFrames(wsBuffer);
        wsBuffer = remaining;
        for (const { opcode, payload } of frames) {
            if (opcode === 0x8) { close(); return; }
            if (opcode === 0x2 || opcode === 0x0) send(payload);
        }
    };

    udp.on('message', (msg) => {
        try { socket.write(wsFrame(msg)); } catch { close(); }
    });
    udp.on('error', close);
    udp.connect(destPort, destIp, () => {
        connected = true;
        for (const data of pending.splice(0)) udp.send(data);
    });

    socket.on('data', (chunk) => {
        wsBuffer = Buffer.concat([wsBuffer, chunk]);
        onFrames();
    });
    socket.on('close', close);
    socket.on('error', close);
    if (wsBuffer.length) onFrames();
}

function startOutboundProxy(port) {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            res.writeHead(403).end('Only WebSocket connections accepted.\n');
        });

        const sockets = new Set();
        const track = socket => {
            sockets.add(socket);
            socket.once('close', () => sockets.delete(socket));
        };
        server.on('connection', track);
        const udpSockets = new Set();
        const trackUdp = udp => {
            udpSockets.add(udp);
            udp.once('close', () => udpSockets.delete(udp));
        };
        // Include upgraded WebSockets and outbound TCP/UDP sockets in teardown.
        server.shutdown = () => {
            for (const socket of sockets) socket.destroy();
            for (const udp of udpSockets) udp.close();
            server.close();
        };

        server.on('upgrade', async (request, socket, head) => {
            // console.error(`[proxy] upgrade: ${request.url}`);
            const key = request.headers['sec-websocket-key'];
            if (!key) { socket.destroy(); return; }
            // The 101 handshake waits until the destination is reachable, so
            // the WebSocket only opens (and a waiting connect() only succeeds)
            // once the TCP connection is up. A failed lookup or connection
            // answers 502 instead: the WebSocket errors, which SOCKFS reports
            // as ECONNREFUSED.
            let accepted = false;
            const accept = () => { accepted = true; socket.write(wsHandshakeResponse(key)); };
            const refuse = () => {
                if (socket.destroyed) return;
                if (accepted) { socket.destroy(); return; }
                socket.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
            };

            // Extract host/port from ?host=X&port=Y
            const url       = new URL(`ws://0.0.0.0${request.url}`);
            const destPort  = Number(url.searchParams.get('port'));
            const destHost  = url.searchParams.get('host');
            // console.error(`[proxy] → ${destHost}:${destPort}`);
            if (!destHost || !destPort || destPort < 1 || destPort > 65535) {
                refuse(); return;
            }

            // DNS resolution
            let destIp = destHost;
            if (isIP(destHost) === 0) {
                try   { destIp = await lookupIPv4(destHost); }
                catch { refuse(); return; }
            }
            if (socket.destroyed) return;

            let wsBuffer = head.length ? head : Buffer.alloc(0);

            if (url.searchParams.get('proto') === 'udp') {
                // Nothing to wait for: UDP has no connection to establish.
                accept();
                relayUdp(socket, wsBuffer, destIp, destPort, trackUdp);
                return;
            }

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
                accept();
                flush();
            });
            track(tcpSocket);
            tcpSocket.on('data',  (data) => {
                // console.error(`[proxy] TCP→WS ${data.length} bytes`);
                try { socket.write(wsFrame(data)); } catch { tcpSocket.end(); }
            });
            // end(), not destroy(): frames still queued for the client get flushed first.
            tcpSocket.on('end',   ()     => socket.end());
            tcpSocket.on('error', ()     => { refuse(); try { tcpSocket.end(); } catch {} });
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

// ─── Yielding poll() ─────────────────────────────────────────────────────────
// The loader's poll() syscall is synchronous: it checks readiness once and
// returns. PHP streams wait through the async wasm_poll_socket() instead, but
// libcurl busy-loops on poll() itself, so Node's event loop never runs, the
// WebSocket to the proxy never opens, and every curl request times out
// (plain HTTP as well as HTTPS). This wrapper keeps the synchronous check,
// and when nothing is ready yet and the caller allows waiting, suspends (JSPI)
// for a few milliseconds so sockets can make progress, until the deadline.
// It only suspends in that case, so readiness checks stay synchronous.
// Waiters wake on any WebSocket activity (see PHPWasmWebSocket), with a short
// timer as a fallback for other descriptors.

const POLL_INTERVAL_MS = 10;
const socketWaiters = new Set();

// Deferred with setImmediate(): SOCKFS registers its own listeners after ours
// and must queue the received data before poll() checks again.
function notifySocketActivity() {
    if (!socketWaiters.size) return;
    setImmediate(() => {
        for (const wake of socketWaiters) wake();
    });
}

function waitForSocketActivity(ms) {
    return new Promise(resolve => {
        const wake = () => {
            clearTimeout(timer);
            socketWaiters.delete(wake);
            resolve();
        };
        const timer = setTimeout(wake, ms);
        socketWaiters.add(wake);
    });
}

function yieldingPoll(syncPoll) {
    return new WebAssembly.Suspending((fds, nfds, timeout) => {
        const ready = syncPoll(fds, nfds, timeout);
        if (ready !== 0 || timeout === 0) return ready;
        const deadline = timeout < 0 ? Infinity : Date.now() + timeout;
        return (async () => {
            for (;;) {
                const remaining = deadline - Date.now();
                if (remaining <= 0) return 0;
                await waitForSocketActivity(Math.min(POLL_INTERVAL_MS, remaining));
                const result = syncPoll(fds, nfds, timeout);
                if (result !== 0) return result;
            }
        })();
    });
}

// Emscripten hook: instantiate the module ourselves so the (already
// instrumented) imports can carry the yielding poll().
function instantiateWithYieldingPoll(loader) {
    return (imports, receiveInstance) => {
        imports.env.__syscall_poll = yieldingPoll(imports.env.__syscall_poll);
        WebAssembly.instantiate(readFileSync(loader.dependencyFilename), imports)
            .then(({ instance, module }) => receiveInstance(instance, module))
            .catch(error => {
                // The loader awaits receiveInstance() forever; surface the failure.
                console.error('[php-wasm] WebAssembly instantiation failed:', error);
                throw error;
            });
        return {};
    };
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

function detectPhpMajorMinorFromLoader(loaderModule) {
    try {
        if (loaderModule && typeof loaderModule.phpVersionString === 'string') {
            const parts = loaderModule.phpVersionString.split('.');
            if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
        }

        if (loaderModule && typeof loaderModule.dependencyFilename === 'string') {
            // dependencyFilename often contains a segment like '8_5_10'
            const m = loaderModule.dependencyFilename.match(/(\d+_\d+)(?:_\d+)?/);
            if (m) return m[1].replace('_', '.');
        }
    } catch {
        // ignore and fallback to undefined
    }
    return undefined;
}

const getPHPRuntime = async () => {
    const loader = await import('../jspi/php_8_5.js');
    const phpMajorMinor = detectPhpMajorMinorFromLoader(loader);

    const runtime = await loadPHPRuntime(
        loader,
        await withDiscoveredPHPExtensions({}, phpMajorMinor)
    );
    return new PHP(runtime);
};

const getPHPRuntimeWithNetwork = async () => {
    const proxyPort  = await getFreePort();
    const httpServer = await startOutboundProxy(proxyPort);

    try {
        const loader = await import('../jspi/php_8_5.js');
        const phpMajorMinor = detectPhpMajorMinorFromLoader(loader);

        const runtime = await loadPHPRuntime(
            loader,
            await withDiscoveredPHPExtensions({
                websocket: {
                    // SOCKFS opens one WebSocket per peer; a SOCK_DGRAM (2)
                    // socket's peer is relayed as UDP by the proxy.
                    url: (sock, host, port) =>
                        `ws://127.0.0.1:${proxyPort}/?host=${host}&port=${port}` +
                        (sock?.type === 2 ? '&proto=udp' : ''),
                    subprotocol: 'binary',
                    decorator:   addSocketOptionsSupportToWebSocketClass,
                },
                instantiateWasm: instantiateWithYieldingPoll(loader),
            }, phpMajorMinor)
        );

        const php = new PHP(runtime);
        php.addEventListener('runtime.beforeExit', () => httpServer.shutdown());
        injectCaBundle(php);
        php._networkProxyServer = httpServer;
        return php;
    } catch (error) {
        httpServer.shutdown();
        throw error;
    }
};

export { getPHPRuntime, getPHPRuntimeWithNetwork, setPhpIniValues, getPhpIniValue };
