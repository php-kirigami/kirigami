// Task-type registry. Plugins register task implementations during their
// normal setup, and the Kirigami engine resolves them alongside its built-in
// task modules. The registry only owns definitions; execution and lifecycle
// decisions remain in @kirigami/kirigami.

import { registry } from './registry.js';

const { taskTypes } = registry;


export function registerTaskType(name, definition) {
	if (typeof name !== 'string' || !name.trim()) {
		throw 'registerTaskType(): "name" must be a non-empty string.';
	}
	if (!definition || typeof definition.run !== 'function') {
		throw `registerTaskType("${name}"): "run" must be a function.`;
	}
	if (definition.validate !== undefined && typeof definition.validate !== 'function') {
		throw `registerTaskType("${name}"): "validate" must be a function.`;
	}
	if (definition.getWatcher !== undefined && typeof definition.getWatcher !== 'function') {
		throw `registerTaskType("${name}"): "getWatcher" must be a function.`;
	}
	if (definition.canwatch && typeof definition.getWatcher !== 'function') {
		throw `registerTaskType("${name}"): watchable task types require "getWatcher".`;
	}
	if (taskTypes.has(name)) {
		throw `registerTaskType("${name}"): a task type with this name is already registered.`;
	}
	taskTypes.set(name, { name, taskname: name, canbuild: false, canwatch: false, ...definition });
}


export function getTaskType(name) {
	return taskTypes.get(name) || null;
}


export function listTaskTypes() {
	return [...taskTypes.values()];
}


export function resetTaskTypes(name) {
	if (name) taskTypes.delete(name);
	else taskTypes.clear();
}
