// ---------------------------------------------------------------------------
// @kirigami/plugin-embed
//
// Registers hooks on the @kirigami/sdk registry:
//
//   - PREPROS_PHP   : includes php/embed.php, which registers the
//                     {% youtube %} / {% vimeo %} Markdown shortcuts (emit
//                     the bare <youtube id="…"> / <vimeo id="…"> tag).
//   - ESBUILD_AFTER : bundles src/embed.js into every esbuild task — the
//                     observer registration + oEmbed fetch/cache + play
//                     button that actually turns the tag into a card.
//   - SASS_AFTER    : appends the default `.embed` card styles, unless
//                     `style: false` — plus a tiny generated file setting
//                     `--embed-max-width` from `options.maxWidth`, since a
//                     JS-side option has no way to reach a *static* SCSS
//                     file otherwise.
//
// kiri's plugin loader calls the default export with this plugin's `options`
// from kirigami.yaml (already validated against ./options.schema.json).
// ---------------------------------------------------------------------------

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from '@kirigami/sdk';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
	style: true,          // inject the default .embed card styles via sass:after
	maxWidth: '40rem',    // caps how wide (and, via aspect-ratio, how tall) a card can get; "none" removes the cap
	forcedAspectRatio: '', // e.g. "16 / 9" — pin every card to one shape instead of each video's own real ratio; empty = each video's real ratio
};


export default function register(options = {}, { config } = {}) {
	const opts = { ...DEFAULTS, ...options };

	on(HOOKS.PREPROS_PHP, () => path.join(pluginDir, 'php', 'embed.php'));

	if (!hasEsbuildTask(config)) {
		console.warn('\x1b[33m⚠\x1b[0m [plugin-embed] no esbuild task found — the observer script that turns <youtube>/<vimeo> tags into cards has nowhere to go. Add one.');
	} else {
		on(HOOKS.ESBUILD_AFTER, () => path.join(pluginDir, 'src', 'embed.js'));
	}

	if (opts.style) {
		on(HOOKS.SASS_AFTER, () => [writeVarsFile(opts), path.join(pluginDir, 'assets', '_embed.scss')]);
	}
}


// `register()` only receives `options` on the JS side — there's no built-in
// channel from there into a *static* PHP or SCSS file. The simplest bridge
// is generating a small file at load time and @use-ing it alongside the
// real stylesheet. Regenerated fresh on every build (synchronous,
// deterministic) — written into this plugin's own install location, so
// nothing to gitignore and no risk of two different projects' builds
// colliding over a shared path.
function writeVarsFile(opts) {
	const file = path.join(pluginDir, '.generated-vars.scss');
	let css = `:root { --embed-max-width: ${opts.maxWidth}; }\n`;
	if (opts.forcedAspectRatio) {
		// embed.js always sets an inline aspect-ratio once the real one is
		// known — !important is what lets a stylesheet rule still win over
		// that inline style, pinning every card to one shape on purpose.
		css += `.embed { aspect-ratio: ${opts.forcedAspectRatio} !important; }\n`;
	}
	fs.writeFileSync(file, css);
	return file;
}


function hasEsbuildTask(config) {
	return Array.isArray(config?.tasks) && config.tasks.some((t) => t?.type === 'esbuild');
}
