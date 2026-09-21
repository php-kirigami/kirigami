import { fork } from 'node:child_process';
import path from 'node:path';

let projectPromise;
let client;

export function startProject(context, folder, output, nodePath) {
	client = new ProjectClient(path.join(context.extensionPath, 'dist/runtime/worker.mjs'), folder, output, nodePath);
	projectPromise = client.call('load').then(() => client);
	return projectPromise;
}

export function getProject() {
	if (!projectPromise) throw new Error('Kirigami project is not initialized.');
	return projectPromise;
}

export async function stopProject() {
	const current = client;
	client = null;
	projectPromise = null;
	await current?.dispose();
}

class ProjectClient {
	constructor(worker, cwd, output, nodePath) {
		this.pending = new Map();
		this.nextId = 0;
		this.child = fork(worker, [], {
			cwd, execPath: nodePath, execArgv: [],
			stdio: ['ignore', 'pipe', 'pipe', 'ipc'], windowsHide: true,
		});
		this.child.stdout.on('data', data => output.append(data.toString()));
		this.child.stderr.on('data', data => output.append(data.toString()));
		this.child.on('message', message => {
			if (message.event === 'build') { this.onBuildResult?.(message.value); return; }
			const entry = this.pending.get(message.id);
			if (!entry) return;
			this.pending.delete(message.id);
			clearTimeout(entry.timer);
			if (message.error) entry.reject(new Error(message.error));
			else entry.resolve(message.value);
		});
		const fail = error => {
			this.failure = error;
			for (const entry of this.pending.values()) {
				clearTimeout(entry.timer);
				entry.reject(error);
			}
			this.pending.clear();
		};
		this.child.on('error', error => fail(new Error(`Cannot start Node (${nodePath}): ${error.message}. Configure kirigami.nodePath with Node 24 or newer.`)));
		this.child.on('exit', (code, signal) => fail(new Error(`Kirigami worker exited (${signal || code}). See the Kirigami output channel.`)));
	}

	call(method, args = []) {
		if (this.failure) return Promise.reject(this.failure);
		return new Promise((resolve, reject) => {
			const id = ++this.nextId;
			const timer = method === 'load' ? setTimeout(() => {
				this.pending.delete(id);
				this.child.kill();
				reject(new Error('Kirigami worker startup timed out. Check kirigami.nodePath (Node 24+).'));
			}, 30000) : undefined;
			this.pending.set(id, { resolve, reject, timer });
			this.child.send({ id, method, args }, error => {
				if (!error) return;
				this.pending.delete(id);
				clearTimeout(timer);
				reject(error);
			});
		});
	}

	build() { return this.call('build'); }
	export() { return this.call('export'); }
	validate() { return this.call('validate'); }
	reload() { return this.call('reload'); }
	run(...args) { return this.call('run', args); }
	listScripts() { return this.call('listScripts'); }
	async serve({ onBuildResult, ...options }) {
		this.onBuildResult = onBuildResult;
		const server = await this.call('serve', [options]);
		return { ...server, close: () => this.call('stopServer') };
	}
	async dispose() {
		if (!this.child.connected) return;
		const timer = setTimeout(() => this.child.kill(), 3000);
		try { await this.call('shutdown'); } catch { /* Already exiting. */ }
		finally { clearTimeout(timer); this.child.kill(); }
	}
}
