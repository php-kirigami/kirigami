// ---------------------------------------------------------------------------
// @kirigami/plugin-extlink
//
// Registers hooks on the @kirigami/sdk registry:
//
//   - PREPROS_PHP : includes php/extlink.php, which registers the
//                   <extlink src="…"> authoring tag (SCRAPER-backed link
//                   preview card, cached to _data/extlink/ + assets/images/
//                   — see that file for the full mechanics).
//   - SASS_AFTER  : appends the default `.extlink` card styles, unless
//                   `style: false`.
//
// kiri's plugin loader calls the default export with this plugin's `options`
// from kirigami.yaml (already validated against ./options.schema.json).
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from '@kirigami/sdk';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
	style: true, // inject the default .extlink card styles via sass:after
};


export default function register(options = {}) {
	const opts = { ...DEFAULTS, ...options };

	on(HOOKS.PREPROS_PHP, () => path.join(pluginDir, 'php', 'extlink.php'));

	if (opts.style) {
		on(HOOKS.SASS_AFTER, () => path.join(pluginDir, 'assets', '_extlink.scss'));
	}
}
