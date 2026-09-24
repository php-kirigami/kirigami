import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { test } from 'node:test';
import { listRepos } from '../bin/libs/github.js';
import {
	listTemplates, createProject, inspectTarget, resolveMeta, writeMinimalPackageJson, writeStarterBanner,
} from '../bin/create.js';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const banner = fs.readFileSync(new URL('../assets/banner-template.txt', import.meta.url), 'utf8');

function fixture(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri create test '));
	t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
	return dir;
}

function tarball(root, files) {
	const chunks = [];
	for (const [name, content] of Object.entries(files)) {
		const data = Buffer.from(content);
		const header = Buffer.alloc(512);
		header.write(`${root}/${name}`);
		header.write(data.length.toString(8).padStart(11, '0'), 124);
		header[156] = 48;
		chunks.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
	}
	return zlib.gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

const json = (body, headers = {}) => new Response(JSON.stringify(body), {
	status: 200, headers: { 'content-type': 'application/json', ...headers },
});

const repo = (name) => ({
	name, full_name: `php-kirigami/${name}`, private: false, description: `${name} description`,
	html_url: `https://github.com/php-kirigami/${name}`, default_branch: 'main', stargazers_count: 1, updated_at: '2026-01-01',
});


test('GitHub client follows Link pagination, filters by glob, and reports rate limits', async (t) => {
	const requests = [];
	t.mock.method(globalThis, 'fetch', async (url, init) => {
		requests.push({ url: String(url), headers: init.headers });
		if (String(url).includes('page=2')) return json([repo('template-blog'), repo('kirigami')]);
		return json([repo('template-demo'), repo('site')], {
			link: '<https://api.github.com/organizations/1/repos?per_page=100&page=2>; rel="next", <https://api.github.com/organizations/1/repos?per_page=100&page=2>; rel="last"',
		});
	});
	const repos = await listRepos('php-kirigami', { pattern: 'template-*', token: 'secret' });
	assert.deepEqual(repos.map(r => r.name), ['template-demo', 'template-blog']);
	assert.equal(repos[0].url, 'https://github.com/php-kirigami/template-demo');
	assert.equal(requests.length, 2);
	assert.equal(requests[0].url, 'https://api.github.com/orgs/php-kirigami/repos?per_page=100');
	assert.equal(requests[0].headers.Authorization, 'Bearer secret');

	t.mock.method(globalThis, 'fetch', async () => new Response('{"message":"API rate limit exceeded"}', {
		status: 403, statusText: 'Forbidden', headers: { 'x-ratelimit-remaining': '0' },
	}));
	await assert.rejects(listRepos('php-kirigami', { token: '' }), /rate limit exceeded — set GITHUB_TOKEN/);
});

test('GitHub client never follows a pagination link off api.github.com', async (t) => {
	t.mock.method(globalThis, 'fetch', async () => json([], { link: '<https://evil.example/repos?page=2>; rel="next"' }));
	await assert.rejects(listRepos('php-kirigami', { token: 'secret' }), /Refusing to query https:\/\/evil\.example/);
});

test('starter package.json uses the core and Canva manifests; banner keeps its tokens', (t) => {
	const dir = fixture(t);
	writeMinimalPackageJson(dir, { slug: 'test-site', description: 'A site', author: 'Tester' }, { cliVersion: '3.4.5' });
	const pkg = readJson(path.join(dir, 'package.json'));
	assert.deepEqual(pkg.devDependencies, {
		'@kirigami/cli': '^3.4.5',
		'@kirigami/kirigami': `^${readJson(new URL('../package.json', import.meta.url)).version}`,
		'@kirigami/canva': `^${readJson(new URL('../../canva/package.json', import.meta.url)).version}`,
	});
	assert.equal(pkg.name, 'test-site');
	assert.equal(pkg.scripts.build, 'kiri build');
	assert.equal(pkg.private, true);

	writeMinimalPackageJson(dir, { slug: 'x' });
	assert.equal(readJson(path.join(dir, 'package.json')).devDependencies['@kirigami/cli'], 'latest');

	assert.equal(writeStarterBanner(dir), true);
	assert.equal(fs.readFileSync(path.join(dir, 'banner.txt'), 'utf8'), banner);
	assert.match(banner, /###PROJECT###/);
	fs.writeFileSync(path.join(dir, 'banner.txt'), 'Custom banner');
	assert.equal(writeStarterBanner(dir), false);
	assert.equal(fs.readFileSync(path.join(dir, 'banner.txt'), 'utf8'), 'Custom banner');
});

test('resolveMeta and inspectTarget fill defaults and ignore local caches', (t) => {
	const dir = fixture(t);
	const target = path.join(dir, 'My Site');
	assert.deepEqual(resolveMeta(target, { baseurl: 'https://someone.github.io/blog' }), {
		name: 'My Site', description: '', author: '', email: '',
		baseurl: 'https://someone.github.io/blog', repo: 'https://github.com/someone/blog', slug: 'my-site',
	});
	assert.equal(inspectTarget(target).exists, false);
	fs.mkdirSync(target);
	fs.writeFileSync(path.join(target, 'package-lock.json'), '{}');
	fs.writeFileSync(path.join(target, 'package.json'), '{}');
	assert.deepEqual(inspectTarget(target), {
		target, exists: true, hasPackageJson: true, hasConfig: false, entries: ['package.json'],
	});
});

test('createProject lists, downloads and scaffolds without prompts or console output', async (t) => {
	const dir = fixture(t);
	t.mock.method(os, 'homedir', () => dir);
	let files;
	const urls = [];
	t.mock.method(globalThis, 'fetch', async (url) => {
		urls.push(String(url));
		if (String(url).startsWith('https://api.github.com/')) return json([repo('template-fixture'), repo('other')]);
		if (String(url) === 'https://registry.npmjs.org/@kirigami%2fcli/latest') return json({ version: '9.8.7' });
		return new Response(tarball('template-fixture-abc123', files));
	});
	const logged = [];
	t.mock.method(console, 'log', (...args) => logged.push(args));

	const templates = await listTemplates();
	assert.deepEqual(templates.map(tpl => tpl.template), ['fixture']);
	// Cached: a second listing doesn't hit the API.
	await listTemplates();
	assert.equal(urls.length, 1);

	files = { 'kirigami.yaml': 'kirigami:\n  project: Template\nprepros: {}\n', '_index.php': '<h1>Hello</h1>', '.node.db': 'x' };
	const progress = [];
	const minimal = await createProject({
		template: 'fixture', target: path.join(dir, 'minimal'), git: false, cliVersion: '1.2.3',
		meta: { author: 'Tester', baseurl: 'https://me.github.io' },
		onProgress: (event) => progress.push(event),
	});
	assert.equal(minimal.success, true);
	assert.deepEqual(progress, [{ step: 'download', url: 'https://github.com/php-kirigami/template-fixture/archive/refs/heads/main.tar.gz' }]);
	assert.equal(minimal.packageJson, 'starter');
	assert.equal(minimal.written, 2);
	assert.equal(minimal.banner, true);
	assert.deepEqual(minimal.git, { initialised: false, committed: false, skipped: 'disabled' });
	const yaml = fs.readFileSync(path.join(dir, 'minimal', 'kirigami.yaml'), 'utf8');
	assert.match(yaml, /project: +minimal/);
	assert.match(yaml, /author: +Tester/);
	assert.match(yaml, /repo: +https:\/\/github.com\/me\/me.github.io/);
	assert.match(yaml, /banner: +banner.txt/);
	assert.equal(fs.existsSync(path.join(dir, 'minimal', '.node.db')), false);
	assert.equal(readJson(path.join(dir, 'minimal', 'package.json')).devDependencies['@kirigami/cli'], '^1.2.3');
	// Tooling the template doesn't ship: MCP for Claude Code, Pages workflow, VS Code settings and extensions.
	assert.deepEqual(minimal.starterFiles, ['.mcp.json', '.github/workflows/page.yml', '.vscode/settings.json', '.vscode/extensions.json']);
	assert.deepEqual(readJson(path.join(dir, 'minimal', '.mcp.json')).mcpServers.kirigami,
		{ command: 'node', args: ['node_modules/@kirigami/cli/bin/kiri.js', 'mcp'] });
	assert.match(fs.readFileSync(path.join(dir, 'minimal', '.github/workflows/page.yml'), 'utf8'), /php-kirigami\/kiribuild/);
	assert.ok(readJson(path.join(dir, 'minimal', '.vscode/settings.json'))['yaml.schemas']);
	assert.ok(readJson(path.join(dir, 'minimal', '.vscode/extensions.json')).recommendations.includes('php-kirigami.kirigami-vscode'));

	// No cliVersion from the caller: the registry's current version is pinned.
	const fresh = await createProject({ template: 'fixture', target: path.join(dir, 'fresh'), git: false });
	assert.equal(fresh.packageJson, 'starter');
	assert.equal(readJson(path.join(dir, 'fresh', 'package.json')).devDependencies['@kirigami/cli'], '^9.8.7');

	// Existing project: package.json merged with its own values winning.
	fs.mkdirSync(path.join(dir, 'existing', '.vscode'), { recursive: true });
	fs.writeFileSync(path.join(dir, 'existing', '.vscode', 'settings.json'), '{ "mine": true }');
	files['.mcp.json'] = '{ "mcpServers": {} }';
	fs.writeFileSync(path.join(dir, 'existing', 'package.json'), JSON.stringify({ name: 'existing-name', scripts: { custom: 'echo existing' } }));
	files['package.json'] = JSON.stringify({ name: 'template', scripts: { custom: 'echo template', build: 'kiri build' } });
	const existing = await createProject({ template: 'template-fixture', target: path.join(dir, 'existing'), git: false });
	assert.equal(existing.packageJson, 'merged');
	const pkg = readJson(path.join(dir, 'existing', 'package.json'));
	assert.equal(pkg.name, 'existing-name');
	assert.deepEqual(pkg.scripts, { custom: 'echo existing', build: 'kiri build' });
	// Neither the project's own settings nor the template's .mcp.json are replaced.
	assert.deepEqual(existing.starterFiles, ['.github/workflows/page.yml', '.vscode/extensions.json']);
	assert.equal(fs.readFileSync(path.join(dir, 'existing', '.vscode', 'settings.json'), 'utf8'), '{ "mine": true }');
	assert.equal(fs.readFileSync(path.join(dir, 'existing', '.mcp.json'), 'utf8'), '{ "mcpServers": {} }');

	assert.deepEqual(await createProject({ template: 'nope', target: dir, git: false }), { success: false, error: 'Unknown template "nope".' });
	assert.deepEqual(logged, []);
});
