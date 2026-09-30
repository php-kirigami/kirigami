// ---------------------------------------------------------------------------
// @kirigami/plugin-clip
//
// Registers hooks on the @kirigami/sdk registry:
//
//   - PREPROS_PHP   : includes php/clip.php, which registers the {% clip %}
//                     Markdown shortcut (emits the bare <clip src="…"> tag).
//   - PREPROS_HTML  : the build-time pass — @kirigami/bestframe picks the best
//                     still frame of each referenced video (cached in
//                     <root>/_data/clip/), the poster goes through the image
//                     pipeline like <img asset>, and the tag becomes the card.
//   - ESBUILD_AFTER : bundles src/clip.js (click-to-play).
//   - SASS_AFTER    : appends the default `.clip` styles, unless `style: false`.
//
// kiri's plugin loader calls the default export with this plugin's `options`
// from kirigami.yaml (already validated against ./options.schema.json).
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from '@kirigami/sdk';
import { renderClips } from './src/build.js';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
	style: true,       // inject the default .clip styles via sass:after
	posterWidth: 960,  // published poster width, in pixels
	samples: 24,       // timestamps bestframe samples to pick the poster
};


export default function register(options = {}, { config } = {}) {
	const opts = { ...DEFAULTS, ...options };

	on(HOOKS.PREPROS_PHP, () => path.join(pluginDir, 'php', 'clip.php'));
	on(HOOKS.PREPROS_HTML, (html, ctx) => renderClips(html, ctx, opts));

	if (!hasEsbuildTask(config)) {
		console.warn('\x1b[33m⚠\x1b[0m [plugin-clip] no esbuild task found — the script that plays a <clip> has nowhere to go. Add one.');
	} else {
		on(HOOKS.ESBUILD_AFTER, () => path.join(pluginDir, 'src', 'clip.js'));
	}

	if (opts.style) {
		on(HOOKS.SASS_AFTER, () => path.join(pluginDir, 'assets', '_clip.scss'));
	}
}


function hasEsbuildTask(config) {
	return Array.isArray(config?.tasks) && config.tasks.some((t) => t?.type === 'esbuild');
}
