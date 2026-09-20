import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Resolve through the installed package graph, including nested dependencies.
function coreManifestPath() {
	return require.resolve('@kirigami/kirigami/package.json');
}

export function writeMinimalPackageJson(target, meta) {
	const cli = require('../package.json');
	const corePath = coreManifestPath();
	const core = require(corePath);
	const canva = createRequire(corePath)('@kirigami/canva/package.json');
	const pkg = {
		name: meta.slug,
		version: '1.0.0',
		description: meta.description || '',
		author: meta.author || '',
		license: 'MIT',
		type: 'module',
		private: true,
		engines: { node: '>=24.0.0', npm: '>=10.2.3' },
		scripts: { build: 'kiri build', watch: 'kiri watch', export: 'kiri export' },
		devDependencies: {
			'@kirigami/cli': `^${cli.version}`,
			'@kirigami/kirigami': `^${core.version}`,
			'@kirigami/canva': `^${canva.version}`,
		},
	};
	fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

export function copyStarterBanner(target) {
	const dest = path.join(target, 'banner.txt');
	if (fs.existsSync(dest)) return false;
	const source = path.join(path.dirname(coreManifestPath()), 'assets', 'banner-template.txt');
	fs.copyFileSync(source, dest);
	return true;
}
