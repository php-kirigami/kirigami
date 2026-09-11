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
//                     `style: false`.
//
// kiri's plugin loader calls the default export with this plugin's `options`
// from kirigami.yaml (already validated against ./options.schema.json).
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from '@kirigami/sdk';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
	style: true, // inject the default .embed card styles via sass:after
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
		on(HOOKS.SASS_AFTER, () => path.join(pluginDir, 'assets', '_embed.scss'));
	}
}


function hasEsbuildTask(config) {
	return Array.isArray(config?.tasks) && config.tasks.some((t) => t?.type === 'esbuild');
}
