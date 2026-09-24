import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getTaskType } from '@kirigami/sdk';

const tasksDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tasks');

// Reserved names: a plugin registering one of these is a collision, not an
// override — resolveTaskType() below always prefers the built-in, so an
// unchecked collision would silently discard the plugin's definition.
export const builtInTaskTypes = new Set(['dist', 'esbuild', 'prepros', 'sass']);
const modules = new Map();


export async function resolveTaskType(type) {
	if (modules.has(type)) return modules.get(type);

	if (builtInTaskTypes.has(type)) {
		const builtInPath = path.join(tasksDir, `${type}.js`);
		const taskModule = await import(pathToFileURL(builtInPath).href);
		modules.set(type, taskModule);
		return taskModule;
	}

	const registered = getTaskType(type);
	if (!registered) return null;
	const taskModule = { ...registered, default: registered.run };
	modules.set(type, taskModule);
	return taskModule;
}


// Plugin reload resets the SDK registry. Registered task definitions may then
// be replaced, so discard only cached plugin task modules; built-ins are safe
// to import again through Node's module cache.
export function clearResolvedTaskTypes() {
	modules.clear();
}
