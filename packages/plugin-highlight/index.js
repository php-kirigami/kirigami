// ---------------------------------------------------------------------------
// @kirigami/plugin-highlight
//
// Registers hooks on the @kirigami/sdk registry:
//
//   - PREPROS_HTML  : rewrites every fenced code block in the rendered pages
//                     with highlight.js markup (build time, no runtime JS).
//   - SASS_AFTER    : appends the theme stylesheet (+ font, + copy-button
//                     layout) for that markup.
//   - ESBUILD_AFTER : appends the copy-button script, when `copyButton` is on.
//
// kiri's plugin loader calls the default export with this plugin's `options`
// from kirigami.yaml (already validated against ./options.schema.json). The
// DEFAULTS below fill in anything the project left out.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { on, HOOKS } from '@kirigami/sdk';
import { highlightHtml } from './src/highlight.js';

const pluginDir = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
	languages: [
		'php', 'javascript', 'typescript', 'bash', 'json', 'yaml',
		'css', 'scss', 'xml', 'markdown', 'sql', 'python',
	],
	theme: 'auto',      // 'auto' | 'dark' | 'light' | 'none'
	autodetect: true,   // guess the language of un-tagged code blocks
	embedFont: true,    // emit the embedded JetBrains Mono @font-face
	copyButton: true,   // hover "Copy" button on every code block
	tag: true,          // register the <highlight lang="…"> authoring tag
};

const THEMES = new Set(['auto', 'dark', 'light']);
const scss = (name) => path.join(pluginDir, 'assets', `${name}.scss`);
const js = (name) => path.join(pluginDir, 'assets', `${name}.js`);
const php = (name) => path.join(pluginDir, 'php', `${name}.php`);


export default function register(options = {}, { config } = {}) {
	const opts = { ...DEFAULTS, ...options };

	on(HOOKS.PREPROS_HTML, (html) => highlightHtml(html, opts));

	// PHP: `php/page.php` wires the `@highlight false` page opt-out (always on);
	// `php/highlight.php` adds the <highlight lang="…">…</highlight> authoring
	// tag, which emits <pre><code class="language-…"> for the pass above.
	on(HOOKS.PREPROS_PHP, () => opts.tag ? [php('page'), php('highlight')] : php('page'));

	// Sass: theme colours + font @font-face + copy-button layout, each appended
	// after the project's entry. `theme: none` skips the palette (you @use the
	// mixin yourself) but still emits the font / copy-button structure.
	const sassFiles = [];
	if (opts.embedFont) sassFiles.push(scss('inject-font'));
	if (opts.copyButton) sassFiles.push(scss('inject-copy'));
	if (opts.theme && opts.theme !== 'none') {
		if (!THEMES.has(opts.theme)) {
			throw `[plugin-highlight] invalid theme "${opts.theme}" (expected: auto, dark, light, none).`;
		}
		sassFiles.push(scss(`inject-${opts.theme}`));
	}
	if (sassFiles.length) on(HOOKS.SASS_AFTER, () => sassFiles);

	// esbuild: the copy-button script, bundled into every JS entry.
	if (opts.copyButton) {
		if (!hasEsbuildTask(config)) {
			console.warn('\x1b[33m⚠\x1b[0m [plugin-highlight] copyButton is on but kirigami.yaml has no esbuild task — the button script has nowhere to go. Add one, or set copyButton: false.');
		}
		on(HOOKS.ESBUILD_AFTER, () => js('copy'));
	}
}


function hasEsbuildTask(config) {
	return Array.isArray(config?.tasks) && config.tasks.some((t) => t?.type === 'esbuild');
}
