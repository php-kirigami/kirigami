import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// npm gives a plugin its own copy of @kirigami/sdk when it pins another
// version than the engine. A copy from 0.3.0 on shares the engine's registry;
// an older one would silently drop the plugin's hooks, so loading fails.
test('a plugin with its own @kirigami/sdk copy works from 0.3.0 and fails clearly before', async (t) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-plugin-sdk-'));
	const cwd = process.cwd();
	const write = (file, content) => {
		const target = path.join(dir, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	};

	write('src/_index.php', '<p>hello</p>');
	const plugin = 'node_modules/kirigami-plugin-own-sdk';
	write(`${plugin}/package.json`, JSON.stringify({ name: 'kirigami-plugin-own-sdk', version: '1.0.0', type: 'module', main: 'index.js' }));
	write(`${plugin}/index.js`, `
import { on, HOOKS } from '@kirigami/sdk';
export default function register() {
  on(HOOKS.COMMANDS_REGISTER, () => ({ name: 'own-sdk', run: async () => ({ success: true }) }));
}`);
	// The plugin's nested copy of the SDK.
	const sdk = path.join(dir, plugin, 'node_modules', '@kirigami', 'sdk');
	const source = fileURLToPath(new URL('../../sdk/', import.meta.url));
	for (const entry of ['index.js', 'package.json', 'src']) fs.cpSync(path.join(source, entry), path.join(sdk, entry), { recursive: true });
	write('kirigami.yaml', JSON.stringify({
		kirigami: { project: 'Own SDK', baseurl: 'https://example.com', root: 'src' },
		plugins: [{ name: 'kirigami-plugin-own-sdk', active: true }],
	}));
	process.chdir(dir);

	const { load } = await import('../index.js');
	const { getCommand } = await import('@kirigami/sdk');
	t.after(() => {
		process.chdir(cwd);
		fs.rmSync(dir, { recursive: true, force: true });
	});

	const project = await load();
	assert.ok(getCommand('own-sdk'), 'the hook registered through the copy reached the engine');

	const manifest = path.join(sdk, 'package.json');
	fs.writeFileSync(manifest, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifest, 'utf8')), version: '0.2.1' }));
	await assert.rejects(project.reload(), (error) => {
		assert.match(String(error), /kirigami-plugin-own-sdk.*own copy of @kirigami\/sdk 0\.2\.1.*npm install kirigami-plugin-own-sdk@latest/);
		return true;
	});
});
