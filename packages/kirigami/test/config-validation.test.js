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

test('loadConfig rejects the php-prepros 2.x seo.jsonld sub-block and seo.language', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-config-'));
	fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	const load = (seo) => {
		fs.writeFileSync(path.join(dir, 'kirigami.yaml'), `
kirigami:
  project: Demo
  baseurl: https://example.com
  root: src
seo:
${seo}
`);
		return loadConfig(path.join(dir, 'kirigami.yaml'));
	};

	await assert.rejects(() => load('  jsonld:\n    lang: fr-CA'), /move its keys up into seo/);
	await assert.rejects(() => load('  language: fr-CA'), /renamed seo.lang/);
	const config = await load('  jsonld: false\n  lang: fr-CA\n  logo: images/logo.png');
	assert.equal(config.seo.jsonld, false);
});

test('loadConfig validates the studio block for Kiri Studio', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-config-'));
	fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	const load = (studio) => {
		fs.writeFileSync(path.join(dir, 'kirigami.yaml'), `
kirigami:
  project: Demo
  baseurl: https://example.com
  root: src
studio:
${studio}
`);
		return loadConfig(path.join(dir, 'kirigami.yaml'));
	};

	// An empty block is enough to make the site editable.
	fs.writeFileSync(path.join(dir, 'kirigami.yaml'), `
kirigami:
  project: Demo
  baseurl: https://example.com
  root: src
studio: {}
`);
	assert.deepEqual((await loadConfig(path.join(dir, 'kirigami.yaml'))).studio, {});

	// Paths to existing .yaml/.json files must stay paths, not get inlined.
	fs.mkdirSync(path.join(dir, '_data'));
	fs.mkdirSync(path.join(dir, '_schemas'));
	fs.writeFileSync(path.join(dir, '_data', 'team.yaml'), '- name: Ada\n');
	fs.writeFileSync(path.join(dir, '_schemas', 'team.json'), '{ "type": "array" }');

	const config = await load(`  branch: main
  images: assets/images
  imageWidth: 640
  files: src/documents
  include:
    - _data/team.yaml
    - path: src/blog/*.md
      label: Blog posts
      create: true
  exclude: [src/data/_stats.json]
  labels:
    src/data/_articles.yaml: Articles
  schemas:
    _schemas/team.json: _data/team.yaml
    https://example.com/articles.schema.json: [_articles.yaml, src/news/*.yaml]`);
	assert.equal(config.studio.include[0], '_data/team.yaml');
	assert.equal(config.studio.schemas['_schemas/team.json'], '_data/team.yaml');
	assert.deepEqual(config.studio.schemas['https://example.com/articles.schema.json'], ['_articles.yaml', 'src/news/*.yaml']);
	assert.equal(config.studio.files, 'src/documents');
	assert.equal(config.studio.imageWidth, 640);
	assert.equal((await load('  images: false')).studio.images, false);

	await assert.rejects(() => load('  unknown: true'));
	await assert.rejects(() => load('  images: true'));
	await assert.rejects(() => load('  imageWidth: wide'));
	await assert.rejects(() => load('  include:\n    - label: No path'));
	await assert.rejects(() => load('  schemas:\n    a.json: { file: a.yaml }'));
	await assert.rejects(() => load('  schemas:\n    a.json: [1]'));
});
