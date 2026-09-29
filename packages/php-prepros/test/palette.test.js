import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { test } from 'node:test';

// A tiny RGB PNG: horizontal bands of the given colours, one per band.
function bandedPng(colors, width = 60, bandHeight = 20) {
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
    const height = colors.length * bandHeight;
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
    const rows = [];
    for (let y = 0; y < height; y++) {
        const [r, g, b] = colors[Math.floor(y / bandHeight)];
        rows.push(Buffer.from([0, ...Array.from({ length: width }, () => [r, g, b]).flat()]));
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

test('IMG::palette() extracts colours with the Aura extension', async t => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-palette-'));
    const previous = process.cwd();
    fs.mkdirSync(path.join(parent, 'src'), { recursive: true });
    fs.mkdirSync(path.join(parent, 'assets', 'images'), { recursive: true });
    fs.writeFileSync(path.join(parent, 'kirigami.yaml'), JSON.stringify({
        kirigami: { root: 'src', project: 'Palette', baseurl: 'https://example.com' },
        prepros: {},
    }));
    fs.writeFileSync(path.join(parent, 'src', '_index.php'), '<p>home</p>');
    // Saturated red, green and blue bands: Aura should keep them apart.
    fs.writeFileSync(path.join(parent, 'assets', 'images', 'bands.png'), bandedPng([[200, 40, 40], [40, 160, 60], [40, 70, 200]]));
    process.chdir(parent);
    const api = await import('../index.js');
    t.after(async () => {
        await api.resetRuntime();
        process.chdir(previous);
        assert.equal(path.dirname(parent), os.tmpdir());
        fs.rmSync(parent, { recursive: true, force: true });
    });

    // The static aura extension has to be in the PHP runtime prepros boots.
    // This runs on the workspace's php-wasm; a stale published pin is what
    // scripts/publish.js checks before a release.
    const result = await api.processImages([
        { op: 'palette', src: 'bands.png', count: 3 },
        { op: 'palette', src: 'bands.png', count: 10 },
    ]);
    assert.equal(result.success, true, JSON.stringify(result));

    // Which swatches Aura finds eligible is its own business (it drops some
    // hues); what matters here is real, distinct, capped colours.
    const three = result.colors['bands.png:3'];
    assert.ok(three.length >= 2 && three.length <= 3, JSON.stringify(three));
    for (const hex of three) assert.match(hex, /^#[0-9a-f]{6}$/);
    assert.equal(new Set(three).size, three.length, 'colours are distinct');

    // Aura yields at most six swatches, so a larger request is capped.
    const many = result.colors['bands.png:10'];
    assert.ok(many.length >= 1 && many.length <= 6, JSON.stringify(many));
});
