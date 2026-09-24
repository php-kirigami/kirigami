// ---------------------------------------------------------------------------
// The process-wide registries behind hooks.js, commands.js and task-types.js.
//
// npm installs a second copy of @kirigami/sdk when a plugin pins a different
// version than the engine. Module-level Maps would then give each copy its
// own registry, and the plugin's hooks would never reach the engine. Keeping
// them on globalThis under a registered symbol makes every copy from 0.3.0 on
// share one registry. The shape is versioned in the key: change it only
// together with the key, since older copies keep using the old shape.
// ---------------------------------------------------------------------------

const KEY = Symbol.for('@kirigami/sdk/registry/v1');

export const registry = (globalThis[KEY] ??= {
	listeners: new Map(), // hookName -> Set<fn>
	commands: new Map(),  // name -> { description, run }
	taskTypes: new Map(), // name -> definition
});
