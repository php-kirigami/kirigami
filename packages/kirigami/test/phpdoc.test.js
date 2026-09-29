import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstDocBlock, pageDataFiles, parseDocBlock } from '../bin/libs/phpdoc.js';

test('parseDocBlock follows php-prepros: tags, continuations, prose', () => {
	assert.deepEqual(parseDocBlock('/**\n * Prose with an @inline word.\n *\n * @title About\n * @desc wraps\n *   here\n * Flush-left prose ends it.\n */'), {
		title: 'About',
		desc: 'wraps here',
	});
});

test('firstDocBlock only reads doc comments in PHP code', () => {
	assert.equal(firstDocBlock('<p>/** html */</p><?php /** @title Yes */'), '/** @title Yes */');
	assert.equal(firstDocBlock('no php'), null);
});

test('pageDataFiles resolves data annotations against the page, skipping URLs', () => {
	const source = '<?php\n/**\n * @title Pubs\n * @list ../_data/list.yaml\n * @body _body.md\n * @remote https://x.com/a.json\n * @image cover.jpg\n */';
	assert.deepEqual(pageDataFiles('publications/_index.php', source), ['_data/list.yaml', 'publications/_body.md']);
});
