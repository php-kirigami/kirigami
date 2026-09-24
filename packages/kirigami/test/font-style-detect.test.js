import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFontData, detectFontStyle } from '../bin/tasks/sass.js';

test('detectFontStyle marks a binary ital axis as a sentinel for split @font-face handling', () => {
	const font = {
		variationAxes: { ital: { min: 0, max: 1 } },
		characterSet: new Set([65, 66, 67]),
		italicAngle: 0,
		subfamilyName: 'Regular',
	};

	assert.equal(detectFontStyle(font), 'ital-axis');
	assert.deepEqual(computeFontData(font), {
		weightRange: '400 400',
		stretchRange: '100% 100%',
		unicodeRange: 'U+41-43',
		style: 'ital-axis',
		hasItalAxis: true,
		italAxisRange: '0 1',
	});
});

test('detectFontStyle keeps classic fonts in the normal/italic path', () => {
	const font = {
		variationAxes: {},
		characterSet: new Set([65, 66]),
		italicAngle: 12,
		subfamilyName: 'Regular',
	};

	assert.equal(detectFontStyle(font), 'italic');
	assert.equal(computeFontData(font).hasItalAxis, false);
});
