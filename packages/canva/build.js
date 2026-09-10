import { build, formatMessages } from "esbuild";
import { watch as chokidarWatch } from "chokidar";
import fg from "fast-glob";
import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import path from "node:path";

const isWatch = process.argv.includes("--watch");

const SRC_SCRIPTS = "src/scripts";
const SRC_STYLES = "src/styles";
const DIST_SCRIPTS = "dist/scripts";
const DIST_STYLES = "dist/styles";


async function printWarnings(warnings) {
	if (!warnings?.length) return;
	const formatted = await formatMessages(warnings, {
		kind: "warning",
		color: true,
		terminalWidth: process.stdout.columns || 80,
	});
	console.warn(formatted.join("\n"));
}

// Simple lock: if a build is already running, ignore concurrent triggers and
// re-run a single build right after, not several in parallel.
let scriptsBuildRunning = false;
let scriptsBuildQueued = false;

async function buildScripts() {
	if (scriptsBuildRunning) {
		scriptsBuildQueued = true;
		return;
	}
	scriptsBuildRunning = true;

	try {
		const entries = await fg(`${SRC_SCRIPTS}/**/*.js`);
		if (entries.length > 0) {
			await build({
				entryPoints: entries,
				outdir: DIST_SCRIPTS,
				outbase: SRC_SCRIPTS,
				format: "esm",
				bundle: false, // one source file = one dist file
				sourcemap: true,
				// legalComments: 'inline',
				target: ["es2022"],
				platform: "browser",
				logLevel: "info",
				loader: { '.json': 'json' },
				// banner: { js: bannerText },
			});

			await printWarnings(result.warnings);
			console.log(`✔ scripts built (${entries.length} file(s))`);
		}
	} catch (err) {
		let msg = err;
		if (err?.errors?.length) {
			const formatted = await formatMessages(err.errors, {
				kind: "error",
				color: true,
				terminalWidth: process.stdout.columns || 80,
			});
			msg = formatted.join("\n");
		}
		return {
			success: false,
			error: msg,
		};
	} finally {
		scriptsBuildRunning = false;
		if (scriptsBuildQueued) {
			scriptsBuildQueued = false;
			await buildScripts(); // re-run once with the most recent state
		}
	}
}

async function copyDeclarations() {
	try {
		const entries = await fg(`${SRC_SCRIPTS}/**/*.d.ts`);
		for (const file of entries) {
			const rel = path.relative(SRC_SCRIPTS, file);
			const dest = path.join(DIST_SCRIPTS, rel);
			await mkdir(path.dirname(dest), { recursive: true });
			await copyFile(file, dest);
		}
		if (entries.length) console.log(`✔ .d.ts copied (${entries.length} file(s))`);
	} catch (err) {
		console.error("✘ failed to copy .d.ts:", err.message);
	}
}

async function copyStyles() {
	try {
		await mkdir(DIST_STYLES, { recursive: true });
		await cp(SRC_STYLES, DIST_STYLES, { recursive: true });
		console.log("✔ styles copied");
	} catch (err) {
		console.error("✘ failed to copy styles:", err.message);
	}
}

async function buildAll() {
	await rm("dist", { recursive: true, force: true });
	await buildScripts();
	await copyDeclarations();
	await copyStyles();
}

// Generic debounce: avoids handling each fs event individually when several
// arrive in a burst for the same save.
function debounce(fn, delay = 100) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	};
}

async function main() {
	await buildAll();

	if (isWatch) {
		console.log("👀 watch enabled...");

		const debouncedScripts = debounce((file) => {
			console.log(`[scripts] change: ${file}`);
			buildScripts();
		});

		const debouncedTypes = debounce((file) => {
			console.log(`[types] change: ${file}`);
			copyDeclarations();
		});

		const debouncedStyles = debounce((file) => {
			console.log(`[styles] change: ${file}`);
			copyStyles();
		});

		chokidarWatch(SRC_SCRIPTS, {
			ignoreInitial: true,
			awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 20 },
		}).on("all", (event, file) => {
			if (file.endsWith(".d.ts")) debouncedTypes(file);
			else if (file.endsWith(".js")) debouncedScripts(file);
		});

		chokidarWatch(SRC_STYLES, {
			ignoreInitial: true,
			awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 20 },
		}).on("all", (event, file) => {
			debouncedStyles(file);
		});
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});