import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
// Imported dynamically, after chdir: @kirigami/php-prepros resolves
// kirigami.yaml from the working directory when it is first imported.

test('prepros.format keeps the spaces between text and inline elements', { timeout: 300000 }, async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-format-'));
	const cwd = process.cwd();
	fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), 'kirigami:\n  project: F\n  baseurl: https://example.com\n  root: src\nprepros:\n  format: true\n');
	fs.writeFileSync(path.join(dir, 'src/_index.php'), [
		'<p>Text can be <strong>bold</strong>, <em>italic</em>, <del>struck</del> or <code>code</code>, and <ins>added</ins>.</p>',
		// An element the formatter doesn't know as inline, inside running text.
		'<p>Before <my-tag>custom</my-tag>, after <b>bold</b>.</p>',
		// Text mixed with blocks: the text line keeps its inline neighbours.
		'<div>Intro <b>bold</b>, then<ul><li>one</li></ul>Outro <i>it</i>.</div>',
		// A row of images / links with no text stays one per line.
		'<nav><a href="/a"><img src="a.png"></a><a href="/b"><img src="b.png"></a></nav>',
	].join('\n'));
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { resetRuntime } = await import('@kirigami/php-prepros');
	t.after(async () => {
		await resetRuntime();
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const built = await (await load()).build();
	assert.equal(built.success, true, JSON.stringify(built));
	const html = fs.readFileSync(path.join(dir, 'src/index.html'), 'utf8');
	const flat = (text) => text.replace(/\s+/g, ' ');

	// Same words and spacing as the source once whitespace is collapsed.
	assert.match(flat(html), /<p>Text can be <strong>bold<\/strong>, <em>italic<\/em>, <del>struck<\/del> or <code>code<\/code>, and <ins>added<\/ins>\.<\/p>/);
	assert.doesNotMatch(html, /<\/strong>\s*\n\s*,/, 'no line break before the comma');
	assert.match(flat(html), /Before <my-tag>custom<\/my-tag>, after <b>bold<\/b>\./);
	assert.match(flat(html), /Intro <b>bold<\/b>, then/);
	assert.match(flat(html), /Outro <i>it<\/i>\./);
	// Each image link keeps its own line.
	assert.equal(html.split('\n').filter((line) => /^\s*<a href="\/[ab]">/.test(line)).length, 2);
});
