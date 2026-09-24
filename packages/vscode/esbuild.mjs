import * as esbuild from "esbuild";
import { stageRuntime } from './build/stage-runtime.mjs';

stageRuntime();

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

// Prints the exact lines the inline problem matcher in .vscode/tasks.json
// expects, so the background watch task can signal ready correctly (and F5
// works without the esbuild-problem-matchers extension).
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
	outfile: "dist/extension.js",
	sourcemap: !minify,
	minify,
	logLevel: "silent",
	plugins: [watchLogPlugin],
});

if (watch) {
	await ctx.watch();
} else {
	await ctx.rebuild();
	await ctx.dispose();
}
