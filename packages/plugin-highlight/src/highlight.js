// ---------------------------------------------------------------------------
// Build-time syntax highlighting.
//
// @kirigami/php-prepros (MD class) emits fenced code blocks as a very specific
// shape:
//
//   <pre><code class="language-xxx">ENTITY-ESCAPED SOURCE</code></pre>
//   <pre><code>ENTITY-ESCAPED SOURCE</code></pre>   (no language)
//
// We match that shape, decode the escaped source, run it through highlight.js,
// and write the `.hljs-*` span markup back — the same markup the browser build
// of highlight.js would produce, which is what the SCSS themes target. Nothing
// is shipped to the client.
// ---------------------------------------------------------------------------

import hljs from 'highlight.js/lib/core';
import { dedent } from '@kirigami/canva/helpers';

const registered = new Set();  // language names successfully registered on `hljs`
const warned = new Set();      // language names we've already complained about
let fullBuild = null;          // lazily-loaded full highlight.js, for `languages: "all"`

// Only the entities MD::toHtml() produces via htmlspecialchars(…, ENT_QUOTES).
const DECODE = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&amp;': '&' };

function decode(s) {
	return s.replace(/&(?:lt|gt|quot|amp|#0?39);/g, m => DECODE[m]);
}

function escape(s) {
	return s.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

// <pre><code[ class="language-x"]>…</code></pre>, with optional whitespace/attrs
// tolerance. The body is non-greedy and the source is already entity-escaped,
// so there is no raw `</code>` to trip on. The leading run of horizontal
// whitespace on the `<pre>` line is captured so the rewritten block can be
// re-indented to the same column HTML::format() left it at.
const BLOCK_RE = /([^\S\n]*)<pre>\s*<code(?:\s+class="([^"]*)")?\s*>([\s\S]*?)<\/code>\s*<\/pre>/g;

// Page opt-out: `php/page.php` injects this comment when a page's PHPDOC says
// `@highlight false`. Strip it and leave the page untouched.
const SKIP_MARKER = /\s*<!--\s*kirigami:nohighlight\s*-->/i;

// Per-block opt-out on the `<code>` class — leave the block exactly as authored.
const NOHIGHLIGHT_CLASS = /(?:^|\s)(?:no-?highlight|language-(?:plain(?:text)?|text|none))(?:\s|$)/i;

function langFromClass(cls) {
	if (!cls) return null;
	const m = cls.match(/(?:^|\s)(?:language|lang)-([\w+#.-]+)/i);
	return m ? m[1].toLowerCase() : null;
}


// highlight.js ships one file per canonical language name; some names authors
// naturally type in kirigami.yaml are only *aliases* baked into another
// module (e.g. "html"/"svg" live inside xml.js, "js" inside javascript.js) —
// import() needs the real file. Once that module registers, hljs picks up its
// own `aliases` list automatically, so `engine.getLanguage('html')` resolves
// without any bookkeeping on our side.
const MODULE_ALIASES = {
	html: 'xml', htm: 'xml', svg: 'xml',
	js: 'javascript', jsx: 'javascript',
	ts: 'typescript', tsx: 'typescript',
	md: 'markdown',
	yml: 'yaml',
	sh: 'bash', zsh: 'bash',
	py: 'python',
};

async function ensureLanguage(name, engine) {
	if (registered.has(name) || engine.getLanguage(name)) {
		registered.add(name);
		return true;
	}
	const moduleName = MODULE_ALIASES[name] || name;
	try {
		const mod = await import(`highlight.js/lib/languages/${moduleName}`);
		engine.registerLanguage(moduleName, mod.default);
		registered.add(name);
		registered.add(moduleName);
		return true;
	} catch {
		if (!warned.has(name)) {
			warned.add(name);
			console.warn(`${'\x1b[33m'}⚠${'\x1b[0m'} [plugin-highlight] unknown language: "${name}"`);
		}
		return false;
	}
}


// Resolves the highlight.js engine + the set of usable language names for this
// run, honouring `options.languages` (an explicit list, or the string "all").
async function prepareEngine(options) {
	if (options.languages === 'all') {
		if (!fullBuild) fullBuild = (await import('highlight.js')).default;
		return { engine: fullBuild, languages: fullBuild.listLanguages() };
	}

	const wanted = [].concat(options.languages || []).map(String).map(s => s.toLowerCase());
	const usable = [];
	for (const name of wanted) {
		if (await ensureLanguage(name, hljs)) usable.push(name);
	}
	return { engine: hljs, languages: usable };
}


export async function highlightHtml(html, options = {}) {
	if (!html) return html;
	if (SKIP_MARKER.test(html)) return html.replace(SKIP_MARKER, '');
	if (html.indexOf('<pre>') === -1) return html;

	const { engine, languages } = await prepareEngine(options);
	const autodetect = options.autodetect !== false && languages.length > 0;

	let touched = false;
	const out = html.replace(BLOCK_RE, (whole, indent, cls, body) => {
		// Author opted this block out (`nohighlight`, `language-plaintext`, …):
		// hand it back byte-for-byte.
		if (cls && NOHIGHLIGHT_CLASS.test(cls)) return whole;

		// Drop indentation shared with the surrounding source (a fenced block
		// indented for readability in the markdown/PHP). The <highlight> tag
		// already does this PHP-side via STR::trimIndent; fenced blocks reach
		// Node raw, so mirror it here. Relative indentation is kept.
		const code = dedent(decode(body));
		// HTML::format() runs before this hook: when it pretty-prints, it opens
		// `<pre><code>` then puts the source on its own lines one level deeper
		// (body starts with a newline). Reproduce that exact shape below so the
		// highlighted markup lines up with the rest of the document; the leading
		// run is stripped again before first paint by the de-indent script
		// Kirigami injects (prepros.head).
		const wasFormatted = /^\n/.test(body);
		const requested = langFromClass(cls);
		let rendered;
		let resolved = requested;

		try {
			if (requested && engine.getLanguage(requested)) {
				rendered = engine.highlight(code, { language: requested, ignoreIllegals: true }).value;
			} else if (!requested && autodetect) {
				const auto = engine.highlightAuto(code, languages);
				rendered = auto.value;
				resolved = auto.language || null;
			} else {
				// Requested a language we don't have, or no language + no
				// autodetect: leave the source as-is but still tag it `.hljs`
				// so the theme's background/border/padding apply.
				rendered = escape(code);
				resolved = requested || null;
			}
		} catch {
			rendered = escape(code);
		}

		touched = true;
		const classes = ['hljs', resolved ? `language-${resolved}` : null].filter(Boolean).join(' ');

		if (wasFormatted) {
			const pad = indent + '    ';
			const inner = rendered.split('\n')
				.map(line => line === '' ? '' : pad + line)
				.join('\n');
			return `${indent}<pre><code class="${classes}">\n${inner}\n${indent}</code></pre>`;
		}
		return `${indent}<pre><code class="${classes}">${rendered}</code></pre>`;
	});

	return touched ? out : html;
}
