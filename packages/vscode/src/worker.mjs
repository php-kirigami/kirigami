// Loaded by external Node with cwd set before importing any core modules.
let project;
// Project scaffolding (the Create Project command): works without a loaded
// project, so these are handled before the "Project is not loaded" check.
const SCAFFOLD = new Set(['listTemplates', 'inspectTarget', 'gitUserConfig', 'canInitGit', 'createProject', 'installDependencies']);
let server;
let queue = Promise.resolve();

async function handle(method, args) {
	if (method === 'load') {
		if (Number(process.versions.node.split('.')[0]) < 24 || typeof WebAssembly.Suspending !== 'function') {
			throw new Error('Kirigami requires Node 24+ with WebAssembly JSPI. Set kirigami.nodePath to a compatible Node executable.');
		}
		const { load } = await import('@kirigami/kirigami');
		project = await load();
		return true;
	}
	if (method === 'shutdown') {
		await server?.close();
		const { resetRuntime } = await import('@kirigami/php-prepros');
		await resetRuntime();
		return true;
	}
	if (SCAFFOLD.has(method)) {
		const create = await import('@kirigami/kirigami/create');
		return create[method](...args);
	}
	if (!project) throw new Error('Project is not loaded.');
	switch (method) {
		case 'build': return project.build();
		case 'export': return project.export(...args);
		case 'validate': return project.validate();
		case 'reload': await project.reload(); return true;
		case 'run': return project.run(...args);
		case 'listScripts': return project.scripts;
		case 'serve':
			if (server) throw new Error('Server is already running.');
			server = await project.serve({ ...args[0], onBuildResult: value => {
				if (process.connected) process.send({ event: 'build', value });
			} });
			return { url: server.url, address: server.address, port: server.port };
		case 'stopServer': await server?.close(); server = null; return true;
		default: throw new Error(`Unknown worker operation: ${method}`);
	}
}

process.on('message', message => {
	queue = queue.then(async () => {
		try {
			const value = await handle(message.method, message.args || []);
			if (process.connected) process.send({ id: message.id, value });
		} catch (error) {
			if (process.connected) process.send({ id: message.id, error: error?.stack || String(error) });
		}
	});
});
process.on('disconnect', () => process.exit(0));
