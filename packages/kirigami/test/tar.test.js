import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTar } from '@kirigami/kirigami/internal/tar';

// Minimal ustar archive: one header + padded data per entry, two zero blocks.
function tar(entries) {
	const chunks = [];
	for (const { name, content = '', mode = 0o644, type = '0' } of entries) {
		const data = Buffer.from(content);
		const header = Buffer.alloc(512);
		header.write(name);
		header.write(mode.toString(8).padStart(7, '0'), 100);
		header.write(data.length.toString(8).padStart(11, '0'), 124);
		header.write(type, 156);
		chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
	}
	return Buffer.concat([...chunks, Buffer.alloc(1024)]);
}

test('parseTar returns names, types, data, and permission modes', () => {
	const entries = parseTar(tar([
		{ name: 'package/bin/', type: '5', mode: 0o755 },
		{ name: 'package/bin/tool', content: '#!/bin/sh\n', mode: 0o755 },
		{ name: 'package/README.md', content: 'hi', mode: 0o644 },
	]));

	assert.deepEqual(entries.map(({ name, type, mode }) => ({ name, type, mode })), [
		{ name: 'package/bin/', type: 'dir', mode: 0o755 },
		{ name: 'package/bin/tool', type: 'file', mode: 0o755 },
		{ name: 'package/README.md', type: 'file', mode: 0o644 },
	]);
	assert.equal(entries[0].data, null);
	assert.equal(entries[1].data.toString(), '#!/bin/sh\n');
	assert.equal(entries[2].data.toString(), 'hi');
});

test('parseTar reports mode 0 when the header leaves it empty', () => {
	const buf = tar([{ name: 'a.txt', content: 'x' }]);
	buf.fill(0, 100, 108);
	assert.equal(parseTar(buf)[0].mode, 0);
});
