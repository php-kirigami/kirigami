// ---------------------------------------------------------------------------
// @kirigami/plugin-player
//
// Registers hooks on the @kirigami/sdk registry:
//
//   - PREPROS_PHP   : includes php/player.php, which registers the
//                     {% player %} / {% playlist %} Markdown shortcuts (emit
//                     the bare <player src="…"> / <playlist src="…"> tags).
//   - PREPROS_HTML  : the build-time pass — reads each referenced audio file,
//                     bakes the waveform SVG + metadata (cached in
//                     <root>/_data/player/), publishes the cover through the
//                     image pipeline, and swaps the tag for the player markup.
//   - ESBUILD_AFTER : bundles src/player.js (play/pause, seek, playlist).
//   - SASS_AFTER    : appends the default `.player` styles, unless
//                     `style: false`.
//
// kiri's plugin loader calls the default export with this plugin's `options`
// from kirigami.yaml (already validated against ./options.schema.json).
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from '@kirigami/sdk';
import { renderPlayers } from './src/build.js';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
	style: true,    // inject the default .player styles via sass:after
	samples: 1000,  // waveform points (SVG viewBox width)
	cover: true,    // publish the embedded MP3 cover art through the image pipeline
	coverSize: 240, // square cover edge, in pixels
};


export default function register(options = {}, { config } = {}) {
	const opts = { ...DEFAULTS, ...options };

	on(HOOKS.PREPROS_PHP, () => path.join(pluginDir, 'php', 'player.php'));
	on(HOOKS.PREPROS_HTML, (html, ctx) => renderPlayers(html, ctx, opts));

	if (!hasEsbuildTask(config)) {
		console.warn('\x1b[33m⚠\x1b[0m [plugin-player] no esbuild task found — the script that makes <player> play has nowhere to go. Add one.');
	} else {
		on(HOOKS.ESBUILD_AFTER, () => path.join(pluginDir, 'src', 'player.js'));
	}

	if (opts.style) {
		on(HOOKS.SASS_AFTER, () => path.join(pluginDir, 'assets', '_player.scss'));
	}
}


function hasEsbuildTask(config) {
	return Array.isArray(config?.tasks) && config.tasks.some((t) => t?.type === 'esbuild');
}
