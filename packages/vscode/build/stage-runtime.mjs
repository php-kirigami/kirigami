import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const extensionRoot = fileURLToPath(new URL('../', import.meta.url));

export function stageRuntime() {
	const target = path.resolve(extensionRoot, 'dist/runtime');
	// Only this fixed generated subtree may be removed.
	if (path.dirname(target) !== path.join(extensionRoot, 'dist')) throw new Error('Invalid runtime staging path');
	fs.rmSync(target, { recursive: true, force: true });
	fs.mkdirSync(target, { recursive: true });
	const rootModules = path.join(target, 'node_modules');
	const installed = new Map();
	const inventory = [];
	function resolveManifest(name, from) {
		for (const search of createRequire(from).resolve.paths(name) || []) {
			const file = path.join(search, name, 'package.json');
			if (fs.existsSync(file)) return fs.realpathSync(file);
		}
		throw new Error(`Missing runtime dependency ${name} required by ${from}`);
	}
	function copy(name, from, parent = target, optional = false) {
		let manifest;
		try { manifest = resolveManifest(name, from); }
		catch (error) { if (optional) return; throw error; }
		// Reuse a matching visible dependency; preserve conflicting versions nested.
		for (let dir = parent; dir.startsWith(target); dir = path.dirname(dir)) {
			const visible = installed.get(path.join(dir, 'node_modules', name));
			if (visible) { if (visible === manifest) return; break; }
			if (dir === target) break;
		}
		const rootDest = path.join(rootModules, name);
		const dest = installed.has(rootDest) ? path.join(parent, 'node_modules', name) : rootDest;
		if (installed.get(dest) === manifest) return;
		if (installed.has(dest)) throw new Error(`Conflicting staged dependency ${name}`);
		installed.set(dest, manifest);
		const source = path.dirname(manifest);
		const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
		fs.cpSync(source, dest, {
			recursive: true, dereference: true,
			filter: file => {
				const rel = path.relative(source, file);
				// Type declarations and source maps are about a third of the staged
				// size and are never loaded at runtime.
				return !rel.split(path.sep).some(part => ['node_modules', '.git', '.cache.db', '.node.db', 'test', 'tests'].includes(part)) && !/\.(bak|tgz|map|d\.[cm]?ts)$/.test(rel);
			},
		});
		inventory.push({ name, version: pkg.version, license: pkg.license, path: path.relative(target, dest).replaceAll('\\', '/') });
		const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };
		for (const dependency of Object.keys(deps)) copy(dependency, manifest, dest, dependency in (pkg.optionalDependencies || {}));
		for (const dependency of Object.keys(pkg.peerDependencies || {})) {
			if (!(dependency in deps)) copy(dependency, manifest, dest, Boolean(pkg.peerDependenciesMeta?.[dependency]?.optional));
		}
	}
	// Every runtime dependency of the extension: the engine for the worker, and
	// @kirigami/mcp for the MCP server VS Code launches (see src/mcp.js).
	const manifest = path.join(extensionRoot, 'package.json');
	for (const name of Object.keys(JSON.parse(fs.readFileSync(manifest, 'utf8')).dependencies || {})) copy(name, manifest);
	fs.copyFileSync(path.join(extensionRoot, 'src/worker.mjs'), path.join(target, 'worker.mjs'));
	fs.writeFileSync(path.join(target, 'inventory.json'), JSON.stringify({ platform: process.platform, arch: process.arch, packages: inventory }, null, 2));
	console.log(`Staged ${inventory.length} runtime packages for ${process.platform}-${process.arch}.`);
}
