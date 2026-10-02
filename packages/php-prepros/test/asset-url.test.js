import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { test } from 'node:test';

// A 4x4 grey PNG.
function tinyPng() {
    const crcTable = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
    });
    const crc = (buffer) => {
        let c = 0xffffffff;
        for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
        const body = Buffer.concat([Buffer.from(type), data]);
        const out = Buffer.alloc(body.length + 8);
        out.writeUInt32BE(data.length, 0);
        body.copy(out, 4);
        out.writeUInt32BE(crc(body), body.length + 4);
        return out;
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(4, 0);
    header.writeUInt32BE(4, 4);
    header.set([8, 2, 0, 0, 0], 8);
    const rows = Array.from({ length: 4 }, () => Buffer.from([0, ...Array(12).fill(128)]));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

test('IMG::asset() returns a URL-encoded path for a source name with spaces', async t => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-asset-url-'));
    const previous = process.cwd();
    fs.mkdirSync(path.join(parent, 'src', 'news'), { recursive: true });
    fs.mkdirSync(path.join(parent, 'assets', 'images', 'galeries'), { recursive: true });
    fs.writeFileSync(path.join(parent, 'kirigami.yaml'), JSON.stringify({
        kirigami: { root: 'src', project: 'Asset URL', baseurl: 'https://example.com' },
        prepros: {},
    }));
    fs.writeFileSync(path.join(parent, 'assets', 'images', 'galeries', 'photo (1).png'), tinyPng());
    fs.writeFileSync(path.join(parent, 'src', 'news', '_index.php'),
        '<img asset="galeries/photo (1).png" width="2" alt="">\n<markdown>\n{% img-asset "galeries/photo (1).png" 3 %}\n</markdown>\n');
    process.chdir(parent);
    const api = await import('../index.js');
    t.after(async () => {
        await api.resetRuntime();
        process.chdir(previous);
        assert.equal(path.dirname(parent), os.tmpdir());
        fs.rmSync(parent, { recursive: true, force: true });
    });

    const result = await api.render('news/_index.php');
    assert.equal(result.success, true, JSON.stringify(result));

    const html = fs.readFileSync(path.join(parent, 'src', 'news', 'index.html'), 'utf8');
    // Encoded in the URL; the file on disk keeps the source's name.
    assert.match(html, /src="\.\.\/images\/galeries\/photo%20%281%29-2w\.webp"/);
    assert.match(html, /src="\.\.\/images\/galeries\/photo%20%281%29-3w\.webp"/);
    assert.ok(fs.existsSync(path.join(parent, 'src', 'images', 'galeries', 'photo (1)-2w.webp')));
    assert.ok(fs.existsSync(path.join(parent, 'src', 'images', 'galeries', 'photo (1)-3w.webp')));
});
