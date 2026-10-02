// ---------------------------------------------------------------------------
// @kirigami/plugin-educ
//
// Authoring tags for course pages. Registers hooks on the @kirigami/sdk
// registry:
//
//   - PREPROS_PHP   : includes php/educ.php, which registers the
//                     <checklist> tag and the {% checklist %} shortcut
//                     (markup is built at build time).
//   - ESBUILD_AFTER : bundles src/educ.js into the first esbuild task — the
//                     client-side state (checked items kept in the reader's
//                     localStorage, progress bar).
//   - SASS_AFTER    : appends the default component styles, unless
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
	style: true, // inject the default component styles via sass:after
};


export default function register(options = {}, { config } = {}) {
	const opts = { ...DEFAULTS, ...options };

	on(HOOKS.PREPROS_PHP, () => ['educ.php', 'doclink.php', 'intlink.php', 'color.php', 'bubble.php', 'quote.php', 'tool.php', 'codepen.php', 'medialink.php'].map((f) => path.join(pluginDir, 'php', f)));

	if (!hasEsbuildTask(config)) {
		console.warn('\x1b[33m⚠\x1b[0m [plugin-educ] no esbuild task found — the script that makes <checklist> interactive has nowhere to go. Add one.');
	} else {
		on(HOOKS.ESBUILD_AFTER, () => path.join(pluginDir, 'src', 'educ.js'));
	}

	if (opts.style) {
		on(HOOKS.SASS_AFTER, () => path.join(pluginDir, 'assets', '_educ.scss'));
	}
}


function hasEsbuildTask(config) {
	return Array.isArray(config?.tasks) && config.tasks.some((t) => t?.type === 'esbuild');
}
