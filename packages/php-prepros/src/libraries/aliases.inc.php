<?php

/**
 * Procedural shortcuts for the class library in this folder.
 *
 * Every helper is a thin wrapper over a static method, named
 * `<lowercase class>_<snake_case method>()`:
 *
 *   CURL::getContents(...)  =>  curl_get_contents(...)
 *   IMG::asset(...)         =>  img_asset(...)
 *   MD::toHtml(...)         =>  md_to_html(...)
 *
 * Handy inside page templates and `kiri run` scripts, where the terse
 * function form reads better than the fully-qualified static call. The
 * classes stay the canonical API; these only forward their arguments.
 *
 * Loaded from utils.inc.php, right after the autoloader is registered.
 */


// ===========================================================================
// PREPROS — the engine
// ===========================================================================

/**
 * Compiles a page template (`_name.php`) to its `.html` sibling: runs the
 * `before`/`after` includes, processes registered tags, fires the
 * `pre_render` / `post_render` hooks, applies `HTML::format()` when
 * `format` is on, then marks the result as a build output.
 *
 * @param  string       $file Absolute (or cwd-relative) path to the template.
 * @return string|false       Absolute path of the generated HTML, or false
 *                            if `$file` could not be resolved.
 * @see    PREPROS::render()
 */
function prepros_render(string $file) { return PREPROS::render($file); }

/**
 * Generates `sitemap.xml` and `robots.txt` at the project root from the
 * tree of `_index.php` pages, and marks both as build outputs.
 *
 * @return string|false Absolute path of the generated `sitemap.xml`.
 * @see    PREPROS::sitemap()
 */
function prepros_sitemap() { return PREPROS::sitemap(); }

/**
 * Mounts extra local files (any extension) into the WASM filesystem so PHP
 * can read them during the build.
 *
 * @param  string|string[] $patterns One or more glob patterns, relative to cwd.
 * @return string[]|false            Virtual paths of the mounted files, or
 *                                   false on failure.
 * @see    PREPROS::mount()
 */
function prepros_mount(string|array $patterns) { return PREPROS::mount($patterns); }

/**
 * Stats a file inside the WASM filesystem.
 *
 * @param  string        $path Virtual path to inspect.
 * @return object|false        `stdClass` with `->exists`, `->modifiedAt`, …,
 *                            or false when the file does not exist.
 * @see    PREPROS::fstat()
 */
function prepros_fstat(string $path) { return PREPROS::fstat($path); }

/**
 * Marks one or more files as build outputs (they show up in the result and
 * get copied back to the host).
 *
 * @param  string|string[] $file Absolute path(s) to the generated file(s).
 * @return void
 * @see    PREPROS::exportFile()
 */
function prepros_export_file(string|array $file): void { PREPROS::exportFile($file); }

/**
 * Returns the list of files marked as build outputs so far (de-duplicated).
 *
 * @return string[] Absolute paths.
 * @see    PREPROS::getExportedFiles()
 */
function prepros_get_exported_files(): array { return PREPROS::getExportedFiles(); }

/**
 * Path of the page template currently being rendered.
 *
 * @return string|false The template's path, or false outside of a render.
 * @see    PREPROS::backtraceFile()
 */
function prepros_backtrace_file() { return PREPROS::backtraceFile(); }

/**
 * Registers a custom HTML tag handler, invoked during `post_render`.
 *
 * The callback receives `($fullTag, array $attrs, string $body)` and returns
 * the replacement string, e.g.:
 *
 *   prepros_register_tag('gallery', fn($tag, $attrs, $body) => '<div class="gallery">…</div>');
 *
 * @param  string   $tag Tag name, without angle brackets (`gallery`).
 * @param  callable $clb `function(string $fullTag, array $attrs, string $body): string`
 * @return void
 * @see    PREPROS::registerTag()
 */
function prepros_register_tag(string $tag, callable $clb) { return PREPROS::registerTag($tag, $clb); }

/**
 * Registers a build hook.
 *
 * Known hooks: `boot` (`stdClass $config`, once per process after bootstrap,
 * before any render — return value ignored), `page_info` (fires with
 * `[$file, stdClass $info]`; each callback returns the `$info` object it wants
 * to pass on, so a callback registered later receives that bare object — accept
 * both shapes, e.g. `$page = is_array($p) ? $p[1] : $p;`), `pre_render` (raw
 * template source), `pre_before` / `pre_after`
 * (the `before` / `after` config path, just before that include — echo here to
 * prepend output, return value ignored), `post_before` / `post_after` (the
 * captured header / footer string, right after the include), `post_render`
 * (assembled HTML). The callback receives the hook payload and must return it
 * (possibly modified).
 *
 * @param  string   $hook Hook name.
 * @param  callable $clb  `function(mixed $payload): mixed`
 * @return void
 * @see    PREPROS::registerHook()
 */
function prepros_register_hook(string $hook, callable $clb) { return PREPROS::registerHook($hook, $clb); }

/**
 * Fires a hook and returns the payload after every registered callback has
 * piped it through. Works for the built-in hooks and for any custom hook name
 * a plugin defines.
 *
 * @param  string $hook Hook name.
 * @param  mixed  $data Initial payload.
 * @return mixed        The payload after the last callback.
 * @see    PREPROS::runHook()
 */
function prepros_run_hook(string $hook, mixed $data = null): mixed { return PREPROS::runHook($hook, $data); }

/**
 * Alias of {@see prepros_register_tag()} (historical unprefixed spelling).
 *
 * @param  string   $tag
 * @param  callable $clb `function(string $fullTag, array $attrs, string $body): string`
 * @return void
 */
function register_tag(string $tag, callable $clb) { return PREPROS::registerTag($tag, $clb); }

/**
 * Alias of {@see prepros_register_hook()} (historical unprefixed spelling).
 *
 * @param  string   $hook
 * @param  callable $clb `function(mixed $payload): mixed`
 * @return void
 */
function register_hook(string $hook, callable $clb) { return PREPROS::registerHook($hook, $clb); }


// ===========================================================================
// MD — Markdown -> HTML
// ===========================================================================

/**
 * Converts Markdown to HTML (GitHub-flavored: tables, task lists, GFM
 * alerts, footnotes, reference links, `:emoji:` shortcodes, a safe raw-HTML
 * subset, and `{% plugin %}` tags).
 *
 * @param  string $markdown Markdown source.
 * @return string           HTML fragment.
 * @see    MD::toHtml()
 */
function md_to_html(string $markdown): string { return MD::toHtml($markdown); }

/**
 * Registers a Markdown plugin, usable as `{% name arg "arg 2" %}` (inline)
 * or as a multi-line `{% name … %}` block.
 *
 *   md_register_plugin('video', fn(array $args, string $body) => '<iframe …></iframe>');
 *
 * @param  string   $name Tag name (case-insensitive).
 * @param  callable $clb  `function(array $args, string $body): string`
 * @return void
 * @see    MD::registerPlugin()
 */
function md_register_plugin(string $name, callable $clb): void { MD::registerPlugin($name, $clb); }

/**
 * Removes a previously registered Markdown plugin.
 *
 * @param  string $name Tag name.
 * @return void
 * @see    MD::unregisterPlugin()
 */
function md_unregister_plugin(string $name): void { MD::unregisterPlugin($name); }

/**
 * Names of all currently registered Markdown plugins.
 *
 * @return string[]
 * @see    MD::getRegisteredPlugins()
 */
function md_get_registered_plugins(): array { return MD::getRegisteredPlugins(); }

/**
 * Registers (or overrides) a `:shortcode:` → character emoji mapping.
 *
 * @param  string $shortcode Shortcode, with or without the surrounding colons.
 * @param  string $char      Replacement character(s).
 * @return void
 * @see    MD::registerEmoji()
 */
function md_register_emoji(string $shortcode, string $char): void { MD::registerEmoji($shortcode, $char); }


// ===========================================================================
// HTML — formatter
// ===========================================================================

/**
 * Re-indents an HTML string (PHP 8.4 `Dom\HTMLDocument` / Lexbor, 4-space
 * indent). `<script>` / `<style>` bodies are re-indented but not reformatted.
 *
 * @param  string $html Source HTML.
 * @return string       Pretty-printed HTML, trailing newline included.
 * @see    HTML::format()
 */
function html_format(string $html): string { return HTML::format($html); }


// ===========================================================================
// YAML — parser
//
// Guarded: yaml_parse() / yaml_parse_file() are also the names of the PECL
// yaml extension's functions.
// ===========================================================================

if (!function_exists('yaml_parse')) {
	/**
	 * Parses a YAML string.
	 *
	 * @param  string $yaml  YAML source.
	 * @param  bool   $assoc `true` → mappings as arrays, `false` → `stdClass`.
	 * @return mixed
	 * @see    YAML::parse()
	 */
	function yaml_parse(string $yaml, bool $assoc = false): mixed { return YAML::parse($yaml, $assoc); }
}
if (!function_exists('yaml_parse_file')) {
	/**
	 * Parses a YAML file.
	 *
	 * @param  string $path  Path to the `.yaml` / `.yml` file.
	 * @param  bool   $assoc `true` → arrays, `false` → `stdClass`.
	 * @return mixed
	 * @throws \RuntimeException When the file cannot be read.
	 * @see    YAML::parseFile()
	 */
	function yaml_parse_file(string $path, bool $assoc = false): mixed { return YAML::parseFile($path, $assoc); }
}

/**
 * Parses a YAML/JSON file, then recursively inlines any string value that
 * points to an existing relative `.yaml` / `.yml` / `.json` file.
 *
 * @param  string $path  Path to the root file.
 * @param  bool   $assoc `true` → arrays, `false` → `stdClass`.
 * @return mixed
 * @throws \RuntimeException On an unreadable file or a circular reference.
 * @see    YAML::loadFile()
 */
function yaml_load_file(string $path, bool $assoc = false): mixed { return YAML::loadFile($path, $assoc); }


// ===========================================================================
// SCHEMA — pure-PHP JSON Schema validator (instance class)
// ===========================================================================

/**
 * Builds a JSON Schema validator (Draft-7-ish, Ajv-like API).
 *
 *   $v = schema($schema);
 *   if (!$v->isValid($data)) print_r($v->getErrors());
 *
 * @param  array<string,mixed> $schema The root schema.
 * @return SCHEMA
 * @see    SCHEMA::__construct()
 */
function schema(array $schema): SCHEMA { return new SCHEMA($schema); }

/**
 * One-shot validation. The error list (if any) comes back through `$errors`.
 *
 *   if (!schema_validate($schema, $data, $errors)) { … }
 *
 * @param  array<string,mixed> $schema  The root schema.
 * @param  mixed               $data    Value to validate.
 * @param  string[]|null       $errors  Filled with `"path: message"` strings.
 * @return bool                         `true` when `$data` is valid.
 * @see    SCHEMA::isValid()
 */
function schema_validate(array $schema, mixed $data, ?array &$errors = null): bool
{
	$v = new SCHEMA($schema);
	$ok = $v->isValid($data);
	$errors = $v->getErrors();
	return $ok;
}


// ===========================================================================
// LD — schema.org JSON-LD generator
// ===========================================================================

/**
 * Builds a node and registers it in the page's JSON-LD `@graph`. Any
 * schema.org type is also reachable as `LD::typeName([...])`.
 *
 *   ld_add('Recipe', ['name' => 'Tarte', 'recipeYield' => '6']);
 *
 * @param  string|string[]     $type
 * @param  array<string,mixed> $props
 * @param  string|null         $id   Stable `@id` (repeat calls merge).
 * @return array<string,mixed>       The stored node.
 * @see    LD::add()
 */
function ld_add(string|array $type, array $props = [], ?string $id = null): array { return LD::add($type, $props, $id); }

/**
 * Builds a bare node (`@type` + pruned `$props`) without touching the graph.
 *
 * @param  string|string[]     $type
 * @param  array<string,mixed> $props
 * @return array<string,mixed>
 * @see    LD::node()
 */
function ld_node(string|array $type, array $props = []): array { return LD::node($type, $props); }

/**
 * `['@id' => …]` reference to another node (`#organization`, `#website`, …).
 *
 * @param  string $id Fragment or absolute URL.
 * @return array{@id:string}
 * @see    LD::ref()
 */
function ld_ref(string $id): array { return LD::ref($id); }

/**
 * Adds the site's main entity (`Organization`, or `jsonld.type`) to the graph.
 *
 * @param  array<string,mixed> $overrides
 * @return array<string,mixed>
 * @see    LD::organization()
 */
function ld_organization(array $overrides = []): array { return LD::organization($overrides); }

/**
 * Adds the `Person` behind the site, linked to the `Organization`.
 *
 * @param  array<string,mixed> $overrides
 * @return array<string,mixed>
 * @see    LD::person()
 */
function ld_person(array $overrides = []): array { return LD::person($overrides); }

/**
 * Adds the `WebSite` node.
 *
 * @param  array<string,mixed> $overrides
 * @return array<string,mixed>
 * @see    LD::website()
 */
function ld_website(array $overrides = []): array { return LD::website($overrides); }

/**
 * Adds the current page's `WebPage` node, built from its PHPDOC.
 *
 * @param  array<string,mixed> $overrides
 * @return array<string,mixed>
 * @see    LD::webPage()
 */
function ld_web_page(array $overrides = []): array { return LD::webPage($overrides); }

/**
 * Adds a `BreadcrumbList`. With no `$items` it is derived from the page's
 * ancestor trail (needs `@breadcrumb true`).
 *
 * @param  array<int,array{name?:string,url?:string}>|null $items
 * @param  array<string,mixed>                             $overrides
 * @return array<string,mixed>
 * @see    LD::breadcrumb()
 */
function ld_breadcrumb(?array $items = null, array $overrides = []): array { return LD::breadcrumb($items, $overrides); }

/**
 * Adds an `FAQPage` from a `question => answer` map.
 *
 * @param  array<string,string|array<string,mixed>> $qa
 * @param  array<string,mixed>                      $overrides
 * @return array<string,mixed>
 * @see    LD::faqPage()
 */
function ld_faq_page(array $qa, array $overrides = []): array { return LD::faqPage($qa, $overrides); }

/**
 * The `<script type="application/ld+json">…</script>` block for the current
 * graph, or `''`. Calling this from a template places the block by hand and
 * disables the automatic injection.
 *
 * @param  bool $pretty
 * @return string
 * @see    LD::script()
 */
function ld_script(bool $pretty = true): string { return LD::script($pretty); }

/**
 * The JSON-LD document as a string (no `<script>` wrapper).
 *
 * @param  bool $pretty
 * @return string
 * @see    LD::json()
 */
function ld_json(bool $pretty = true): string { return LD::json($pretty); }


// ===========================================================================
// META — <head> SEO / social metadata generator
// ===========================================================================

/**
 * Adds a `<meta>` tag to the page's `<head>`. The key picks the attribute:
 * `og:*` → `property=`, everything else → `name=`. An empty value is a no-op.
 * Always emitted (and de-duplicated against the page), `meta:` block or not.
 *
 *   meta_tag('twitter:image', 'https://…/card.png');
 *
 * @see META::tag()
 */
function meta_tag(string $name, ?string $content): void { META::tag($name, $content); }

/**
 * Adds a `<link>` tag to the page's `<head>`. `$attrs` are extra attributes
 * (`type`, `sizes`, `hreflang`, …).
 *
 *   meta_link('icon', './favicon.svg', ['type' => 'image/svg+xml']);
 *
 * @param  array<string,string|int|bool|null> $attrs
 * @see    META::link()
 */
function meta_link(string $rel, string $href, array $attrs = []): void { META::link($rel, $href, $attrs); }

/**
 * Adds a verbatim tag line (already valid HTML) to the page's `<head>`.
 *
 * @see META::raw()
 */
function meta_raw(string $html): void { META::raw($html); }

/**
 * The full block of generated `<meta>`/`<link>` lines for the current page,
 * `\n`-joined, or `''`. Calling this places the block by hand.
 *
 * @param  string $html Page HTML, used only to skip tags it already carries.
 * @see    META::tags()
 */
function meta_tags(string $html = ''): string { return META::tags($html); }


// ===========================================================================
// CACHE — persistent key/value (SQLite, `.cache.db` at the project root)
// ===========================================================================

/**
 * Reads a cached value.
 *
 * @param  string $key Cache key.
 * @return mixed        The stored value, or `null` when missing or expired.
 * @see    CACHE::get()
 */
function cache_get(string $key): mixed { return CACHE::get($key); }

/**
 * Writes a cached value.
 *
 * @param  string $key Cache key.
 * @param  mixed  $val Value to store (serialized).
 * @param  int    $ttl Lifetime in seconds; `0` = forever.
 * @return bool        `true` on success.
 * @see    CACHE::set()
 */
function cache_set(string $key, mixed $val, int $ttl = 0): bool { return CACHE::set($key, $val, $ttl); }

/**
 * Deletes a single cache entry.
 *
 * @param  string $key Cache key.
 * @return bool        `true` on success.
 * @see    CACHE::delete()
 */
function cache_delete(string $key): bool { return CACHE::delete($key); }

/**
 * Drops every expired entry from the cache.
 *
 * @return bool `true` on success.
 * @see    CACHE::purge()
 */
function cache_purge(): bool { return CACHE::purge(); }


// ===========================================================================
// IMG — image autogenerator
// ===========================================================================

/**
 * Resolves `$path` against `image.source`, generates a resized copy in
 * `image.dest` (encoded as `image.format`), and returns its URL relative to
 * the file that called this function. Re-uses the existing file when it is
 * newer than the source.
 *
 *   <img src="<?= img_asset('hero.jpg', 800) ?>">
 *
 * @param  string $path   Source image path, relative to `image.source`.
 * @param  int    $width  Target width in px; `0` keeps the aspect ratio.
 * @param  int    $height Target height in px; `0` keeps the aspect ratio.
 * @param  bool   $cover  `true` crops to fill `width`×`height` (center),
 *                        `false` fits inside.
 * @return string         URL of the generated image, relative to the caller.
 * @see    IMG::asset()
 */
function img_asset(string $path, int $width = 0, int $height = 0, bool $cover = false): string
{
	// Forward the real caller's path so IMG::asset() builds the URL
	// relative to the template, not to this wrapper file.
	$trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1);
	return IMG::asset($path, $width, $height, $cover, $trace[0]['file'] ?? '');
}

/**
 * Extracts the most representative colors from an image (median-cut in Lab
 * space, near-white/near-black excluded). CACHE-backed.
 *
 * @param  string $path   Source image path, relative to `image.source`.
 * @param  int    $colors Number of colors to return.
 * @return string[]        Colors as `#rrggbb`, most frequent first.
 * @see    IMG::palette()
 */
function img_palette(string $path, int $colors = 5): array { return IMG::palette($path, $colors); }


// ===========================================================================
// FS — filesystem helpers
// ===========================================================================

/**
 * Recursively walks a directory, yielding every file whose name matches the
 * glob pattern in the last path segment.
 *
 *   foreach (fs_dig('src/*.php') as $file) { … }
 *
 * @param  string $path Directory + glob pattern (e.g. `src/_index.php`).
 * @return iterable<string> File paths.
 * @see    FS::dig()
 */
function fs_dig(string $path): iterable { return FS::dig($path); }

/**
 * Computes the relative path from one location to another (directories are
 * detected and treated as such). Both accept `/` or `\` separators.
 *
 * @param  string $from Source path.
 * @param  string $to   Target path.
 * @return string       Relative path, `/`-separated.
 * @see    FS::getRelativePath()
 */
function fs_get_relative_path(string $from, string $to): string { return FS::getRelativePath($from, $to); }

/**
 * Parses the first PHPDoc block of a PHP file into an object of `@tag`
 * values.
 *
 * @param  string       $file Path to the PHP file.
 * @return object|false        `stdClass` of tag → value, or false when the
 *                            file cannot be resolved.
 * @see    FS::phpFileInfo()
 */
function fs_php_file_info(string $file): object|bool { return FS::phpFileInfo($file); }

/**
 * Immediate child pages of the page being rendered, ordered by `@position`
 * ascending (a missing `@position` counts as 999999), then by folder name.
 *
 * Scans the folders directly below the current page's directory, keeps the
 * ones holding an `_index.php`, and returns one `stdClass` per child: the
 * parsed PHPDOC of that `_index.php`, plus a `->file` key with its absolute
 * path. Works the same from a template, a layout partial or a helper.
 * Only usable during a render.
 *
 *   foreach (fs_get_children() as $page) { echo $page->title, $page->file; }
 *
 * @return object[]
 * @throws \Exception When called outside of a render.
 * @see    FS::getChildren()
 */
function fs_get_children(): array
{
	// Anchored on the page under render (PREPROS::$file), so it behaves the
	// same whether it's called from the template, a layout partial, or a
	// helper function.
	return FS::getChildren();
}

/**
 * Breadcrumb trail of the page being rendered: one `stdClass` per ancestor
 * page, ordered from the top-most ancestor down to the nearest parent (the
 * parsed PHPDOC of each `_index.php`, plus a `->file` key with its absolute
 * path).
 *
 * Returns `[]` unless the current page opts in with `@breadcrumb true` (or
 * `1`). The current page is never part of its own trail; the walk climbs the
 * parent folders and stops at the source root, or at the first ancestor
 * `_index.php` with no active `@breadcrumb` tag (that separator page is left
 * out). Works the same from a template, a layout partial or a helper.
 * Only usable during a render.
 *
 *   foreach (fs_get_breadcrumb() as $crumb):
 *     <a href="<?= FS::getRelativePath(__DIR__, dirname($crumb->file)) ?>/"><?= $crumb->title ?></a>
 *   endforeach
 *
 * @return object[]
 * @throws \Exception When called outside of a render.
 * @see    FS::getBreadcrumb()
 */
function fs_get_breadcrumb(): array
{
	// Anchored on the page under render (PREPROS::$file), so it behaves the
	// same whether it's called from the template, a layout partial, or a
	// helper function.
	return FS::getBreadcrumb();
}

/**
 * Recursively deletes a directory.
 *
 * @param  string $dir        Directory to empty.
 * @param  bool   $removeSelf `true` also removes `$dir` itself; `false`
 *                            leaves it empty.
 * @return bool               `true` on success.
 * @see    FS::rmdir()
 */
function fs_rmdir(string $dir, bool $removeSelf = true): bool { return FS::rmdir($dir, $removeSelf); }

/**
 * Joins path segments with `/`, resolving `.` and `..`. URL-aware: a
 * leading scheme/host is preserved.
 *
 * @param  string ...$parts Path segments.
 * @return string           The joined path.
 * @see    FS::pathJoin()
 */
function fs_path_join(string ...$parts): string { return FS::pathJoin(...$parts); }


// ===========================================================================
// STR — string helpers
// ===========================================================================

/**
 * Escapes a string for HTML output (`htmlspecialchars`, `ENT_QUOTES`, UTF-8).
 *
 * @param  string $str Raw string.
 * @return string      HTML-safe string.
 * @see    STR::htmlesc()
 */
function str_htmlesc(string $str): string { return STR::htmlesc($str); }

/**
 * Replaces every `<$tag …>…</$tag>` (paired, self-closing or opening-only)
 * in `$contents` with the callback's return value. This is the engine
 * behind {@see prepros_register_tag()}.
 *
 * @param  string   $tag      Tag name, without angle brackets.
 * @param  string   $contents Haystack.
 * @param  callable $clb      `function(string $fullMatch, array $attrs, string $inner): string`
 * @return string             `$contents` with every match replaced.
 * @see    STR::replaceTags()
 */
function str_replace_tags(string $tag, string $contents, callable $clb): string { return STR::replaceTags($tag, $contents, $clb); }

/**
 * Parses an HTML attribute string into an associative array (boolean
 * attributes map to `true`).
 *
 * @param  string              $attributes e.g. `href="/x" target="_blank" hidden`
 * @return array<string,string|true>
 * @see    STR::parseHtmlAttributes()
 */
function str_parse_html_attributes(string $attributes): array { return STR::parseHtmlAttributes($attributes); }

/**
 * Removes the common leading whitespace shared by every non-blank line.
 *
 * @param  string $str Indented text.
 * @return string      De-indented text.
 * @see    STR::trimIndent()
 */
function str_trim_indent(string $str): string { return STR::trimIndent($str); }

/**
 * Tells whether a string is an URL with a recognized scheme
 * (http, https, ftp, ftps, ssh, ssl, sftp, itunes).
 *
 * @param  string $str Candidate string.
 * @return bool
 * @see    STR::is_url()
 */
function str_is_url(string $str): bool { return STR::is_url($str); }

/**
 * Trims, then decodes HTML entities (`ENT_QUOTES`, UTF-8).
 *
 * @param  string $str String possibly containing entities.
 * @return string      Decoded string.
 * @see    STR::html_entities_decode()
 */
function str_html_entities_decode(string $str): string { return STR::html_entities_decode($str); }

/**
 * Short, stable digest of a string: the first 12 hex chars of its SHA-256.
 *
 * @param  string $str Input.
 * @return string      12-character hex string.
 * @see    STR::shorthash()
 */
function str_shorthash(string $str): string { return STR::shorthash($str); }

/**
 * Unicode-normalizes a string to NFD and strips combining marks
 * (`é` → `e`, `ü` → `u`).
 *
 * @param  string $str Input.
 * @return string      ASCII-folded string.
 * @see    STR::normalize()
 */
function str_normalize(string $str): string { return STR::normalize($str); }

/**
 * Turns a string into a slug: normalized, lowercased, non-alphanumerics
 * replaced by `$sep`.
 *
 * @param  string $str Input.
 * @param  string $sep Separator; `''` → compact id, `'-'` → hyphenated slug.
 * @return string
 * @see    STR::slug()
 */
function str_slug(string $str, string $sep = ''): string { return STR::slug($str, $sep); }


// ===========================================================================
// ARR — array helpers
// ===========================================================================

/**
 * Depth-first search through a nested array/object structure; returns the
 * value of the first entry keyed `$key` at any depth, or `null`.
 *
 * @param  mixed  $data Array or object to search.
 * @param  string $key  Key to look for.
 * @return mixed         The matched value, or `null`.
 * @see    ARR::find_key()
 */
function arr_find_key(mixed $data, string $key): mixed { return ARR::find_key($data, $key); }


// ===========================================================================
// CURL — network (only usable when kirigami.yaml `network: true`)
// ===========================================================================

/**
 * Checks whether an URL is reachable (HEAD request, follows redirects).
 *
 * @param  string      $url     URL to probe.
 * @param  string|null $mimereg Reserved (currently unused).
 * @return bool                 `true` on a 2xx/3xx response.
 * @see    CURL::urlExists()
 */
function curl_url_exists(string $url, $mimereg = null) { return CURL::urlExists($url, $mimereg); }

/**
 * Returns `curl_getinfo()` for an URL (HEAD request).
 *
 * @param  string       $url URL to probe.
 * @return array|false        The info array, or false for a non-URL.
 * @see    CURL::getInfo()
 */
function curl_get_info(string $url) { return CURL::getInfo($url); }

/**
 * Fetches an URL, browser-like headers and a shared cookie jar included.
 * A drop-in replacement for `file_get_contents()` on remote URLs.
 *
 * @param  string        $file URL to fetch.
 * @param  string|null   $dest Optional local path to stream the body into;
 *                             when set, the function returns a bool instead
 *                             of the body.
 * @param  callable|null $clb  Optional progress callback `function(float $ratio): void`
 *                             (`$ratio` between 0 and 1).
 * @return string|bool         Response body, or (with `$dest`) `true`/`false`.
 * @see    CURL::getContents()
 */
function curl_get_contents(string $file, $dest = null, $clb = null) { return CURL::getContents($file, $dest, $clb); }


// ===========================================================================
// SCRAPER — page metadata (CACHE-backed)
// ===========================================================================

/**
 * Scrapes an URL for its social/meta card.
 *
 * @param  string       $url Page URL.
 * @return object|false       `stdClass` with `->title ->description ->image
 *                            ->label ->url ->key`, or false when the page has
 *                            no usable title.
 * @throws \Exception          When the page cannot be crawled.
 * @see    SCRAPER::get()
 */
function scraper_get(string $url) { return SCRAPER::get($url); }


// ===========================================================================
// OBF — reversible payload obfuscation
// ===========================================================================

/**
 * Obfuscates a value: JSON → base64 → ROT-13 → gzip (2-byte header dropped).
 * Not encryption — just makes an embedded payload non-obvious.
 *
 * @param  mixed  $obj Any JSON-serializable value.
 * @return string      Obfuscated blob.
 * @see    OBF::encode()
 */
function obf_encode(mixed $obj): string { return OBF::encode($obj); }

/**
 * Reverses {@see obf_encode()}.
 *
 * @param  string $str Blob produced by `obf_encode()`.
 * @return mixed        The original value.
 * @see    OBF::decode()
 */
function obf_decode(string $str): mixed { return OBF::decode($str); }


// ===========================================================================
// STD — build-result output (these terminate the process)
// ===========================================================================

/**
 * Writes a success result (exported files + `$props`) as JSON and exits 0.
 *
 * @param  array<string,mixed>|string $props Extra fields, or a plain message
 *                                           string (stored as `message`).
 * @return never
 * @see    STD::succeed()
 */
function std_succeed($props = []): never { STD::succeed($props); exit(0); }

/**
 * Writes an error result as JSON and exits 1.
 *
 * @param  array<string,mixed>|string $props Extra fields, or a plain message
 *                                           string (stored as `error`).
 * @return never
 * @see    STD::error()
 */
function std_error($props = []): never { STD::error($props); exit(1); }
