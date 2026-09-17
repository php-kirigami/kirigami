// esbuild-time substitute for @kirigami/php-prepros (see esbuild.mjs's
// `alias`). @kirigami/php-prepros's package.json only declares an "import"
// export condition, so a bundled CJS require() of it always fails with
// ERR_PACKAGE_PATH_NOT_EXPORTED — and bundling it inline would break
// @kirigami/php-wasm's WASM-binary path resolution, which is relative to its
// own (real, on-disk) file location, not wherever our single-file bundle ends
// up. Loading it through a *dynamic* import() of a non-literal specifier
// keeps esbuild from touching it at all (it can't resolve a variable at
// build time), so Node's real ESM loader — which does honor "import" — loads
// the genuine, unbundled package straight from node_modules at runtime.
// Every named export @kirigami/php-prepros's index.js actually has (see
// its own `export { render, sitemap, runenv, mountPath, processImages }`) —
// kept in sync manually since a dynamic, non-literal import() can't be
// re-exported with `export *`.
const specifier = "@kirigami/php-prepros";

export async function render(...args) {
	const mod = await import(specifier);
	return mod.render(...args);
}

export async function sitemap(...args) {
	const mod = await import(specifier);
	return mod.sitemap(...args);
}

export async function runenv(...args) {
	const mod = await import(specifier);
	return mod.runenv(...args);
}

export async function mountPath(...args) {
	const mod = await import(specifier);
	return mod.mountPath(...args);
}

export async function processImages(...args) {
	const mod = await import(specifier);
	return mod.processImages(...args);
}
