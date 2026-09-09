// ---------------------------------------------------------------------------
// Registre de hooks générique, en mémoire. Les tasks (comme sass.js)
// déclenchent des points d'extension nommés via run(hookName, ...args), et
// n'importe quel module peut s'y greffer via on(hookName, fn).
//
// Ce fichier ne connaît rien de kirigami.yaml ni des plugins eux-mêmes : le
// futur système de plugins (dans un autre fichier) lira kirigami.yaml,
// chargera les packages actifs, et appellera on() pour chaque hook qu'un
// plugin veut fournir. Ici, on ne fait que router.
// ---------------------------------------------------------------------------

const listeners = new Map(); // hookName -> Set<fn>


export function on(hookName, fn) {
	if (!listeners.has(hookName)) listeners.set(hookName, new Set());
	listeners.get(hookName).add(fn);
	return () => off(hookName, fn); // pratique pour se désenregistrer si besoin
}


export function off(hookName, fn) {
	listeners.get(hookName)?.delete(fn);
}


// Exécute tous les listeners d'un hook, dans l'ordre d'enregistrement, et
// aplatit leurs résultats. Un listener peut renvoyer undefined/null (ignoré),
// une valeur unique, ou un tableau de valeurs.
export async function run(hookName, ...args) {
	const fns = listeners.get(hookName);
	if (!fns || !fns.size) return [];

	const results = [];
	for (const fn of fns) {
		const value = await fn(...args);
		if (value == null) continue;
		results.push(...(Array.isArray(value) ? value : [value]));
	}
	return results;
}