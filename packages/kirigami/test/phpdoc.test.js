import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstDocBlock, markdownHeader, pageDataFiles, parseDocBlock } from '../bin/libs/phpdoc.js';

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

test('markdownHeader reads the @tag lines atop a Markdown page, like FS::splitHeader()', () => {
	const inherited = new Set();
	assert.deepEqual(markdownHeader('﻿\n@title Hello\n@abstract wraps\n  here\n@@lang fr\n@type post\n\n@not header\nBody', inherited), {
		title: 'Hello',
		abstract: 'wraps here',
		lang: 'fr',
		type: 'post',
	});
	assert.deepEqual([...inherited], ['lang']);
	assert.deepEqual(markdownHeader('@title A\nFlush-left body starts here\n@later no'), { title: 'A' });
	assert.deepEqual(markdownHeader('# No header\n@title ignored'), {});
	assert.deepEqual(pageDataFiles('blog/_index.md', '@title Blog\n@list _posts.yaml\n\nText'), ['blog/_posts.yaml']);
});

test('@@tags are tracked in PHP doc blocks too; a later plain @tag takes one back', () => {
	const inherited = new Set();
	parseDocBlock('/**\n * @@lang fr\n * @@menu _menu.yaml\n * @menu _local.yaml\n */', inherited);
	assert.deepEqual([...inherited], ['lang']);
	assert.deepEqual(pageDataFiles('_index.php', '<?php\n/**\n * @@menu _menu.yaml\n * @list _list.yaml\n */', { inherited: true }), ['_menu.yaml']);
});
