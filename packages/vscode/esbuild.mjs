import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

// Prints the exact lines VS Code's built-in "$esbuild-watch" problem matcher
// expects, so tasks.json's background watch task can signal ready correctly.
const watchLogPlugin = {
	name: "watch-log",
	setup(build) {
		build.onStart(() => console.log("[watch] build started"));
		build.onEnd((result) => {
			for (const { text, location } of result.errors) {
				console.error(`✘ [ERROR] ${text}`);
				if (location) console.error(`    ${location.file}:${location.line}:${location.column}`);
			}
			console.log("[watch] build finished");
		});
	},
};

const ctx = await esbuild.context({
	entryPoints: ["src/extension.js"],
	bundle: true,
	format: "cjs",
	platform: "node",
	target: "node20",
	external: ["vscode"],
	// @kirigami/php-prepros (statically imported by @kirigami/kirigami's core
	// render + run-script tasks) pulls in @kirigami/php-wasm, whose loader
	// reads its .wasm binary from a path relative to its OWN file (see
	// jspi/php_8_5.js) — bundling it inline would break that path resolution.
	// Plain `external` doesn't work either: php-prepros's package.json only
	// declares an "import" export condition, so a bundled require() of it
	// always throws ERR_PACKAGE_PATH_NOT_EXPORTED. Redirected instead to a
	// local shim (build/prepros-shim.mjs) that loads the real package through
	// a dynamic import() of a non-literal specifier — invisible to esbuild's
	// bundler, so Node's real ESM loader resolves it, unbundled, at runtime.
	alias: { "@kirigami/php-prepros": "./build/prepros-shim.mjs" },
	outfile: "dist/extension.js",
	sourcemap: !minify,
	minify,
	logLevel: "silent",
	plugins: [watchLogPlugin],
	// Some bundled deps (e.g. @kirigami/struct-walker) use ESM's
	// import.meta.url for a createRequire() CJS-interop trick. esbuild's CJS
	// output doesn't always shim import.meta.url correctly on its own
	// (produces an empty object, not a real URL — see esbuild's documented
	// import.meta.url + CJS caveat), so it's shimmed explicitly here.
	define: { "import.meta.url": "import_meta_url" },
	banner: { js: "const import_meta_url = require('url').pathToFileURL(__filename).href;" },
});

if (watch) {
	await ctx.watch();
} else {
	await ctx.rebuild();
	await ctx.dispose();
}
