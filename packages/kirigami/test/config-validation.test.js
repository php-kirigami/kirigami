import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { loadConfig } from '../bin/config.js';

test('loadConfig rejects missing prepros before/after layout files', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-config-'));
	const root = path.join(dir, 'src');
	fs.mkdirSync(root, { recursive: true });
	fs.writeFileSync(path.join(root, '_index.php'), '<?php echo "ok";');
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), `
kirigami:
  project: Demo
  baseurl: https://example.com
  root: src
prepros:
  before: _layouts/missing-header.php
  types:
    article:
      after: _layouts/types/missing-footer.php
`);

	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

	await assert.rejects(
		() => loadConfig(path.join(dir, 'kirigami.yaml')),
		/prepros:before.*does not exist/
	);
});

test('loadConfig accepts existing prepros wrapper files', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-config-'));
	const root = path.join(dir, 'src');
	fs.mkdirSync(path.join(root, '_layouts', 'types'), { recursive: true });
	fs.writeFileSync(path.join(root, '_index.php'), '<?php echo "ok";');
	fs.writeFileSync(path.join(root, '_layouts', 'header.php'), '<header />');
	fs.writeFileSync(path.join(root, '_layouts', 'types', 'article.before.php'), '<article>');
	fs.writeFileSync(path.join(root, '_layouts', 'types', 'article.after.php'), '</article>');
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), `
kirigami:
  project: Demo
  baseurl: https://example.com
  root: src
prepros:
  before: _layouts/header.php
  types:
    article:
      before: _layouts/types/article.before.php
      after: _layouts/types/article.after.php
`);

	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

	const config = await loadConfig(path.join(dir, 'kirigami.yaml'));
	assert.equal(config.prepros.before, '_layouts/header.php');
	assert.equal(config.prepros.types.article.before, '_layouts/types/article.before.php');
	assert.equal(config.prepros.types.article.after, '_layouts/types/article.after.php');
});
