<?php

declare(strict_types=1);

/**
 * META — `<head>` metadata generator.
 *
 * Builds the standard SEO / social `<meta>` and `<link>` tags for a page and
 * injects them into its `<head>`, from three sources, in this order of
 * precedence:
 *
 *   1. the page's own PHPDOC block (`@title`, `@description`, `@image`, …),
 *   2. the top-level `meta:` block of `kirigami.yaml` (config + overrides),
 *   3. the loose keys of the `kirigami:` block and the top-level `jsonld:`
 *      block (`description`, `keywords`, `author`, `person`, `lang`, `logo`,
 *      `image`, …) — the same values `LD` already reads.
 *
 * It only ever emits what it can resolve: a tag with no value is skipped, and a
 * tag the page's layout already hand-writes (`<title>`, `<meta name="description">`,
 * `<link rel="canonical">`, …) is left untouched — so it slots in next to an
 * existing `header.php` without doubling anything up.
 *
 * Automatic injection is **opt-in**: it needs a top-level `meta:` block (an
 * empty map, `meta: {}`, is enough). `meta: false` (or `meta: { auto: false }`)
 * keeps the config values but stops the injection; no block at all means
 * nothing is injected — an explicit `META::tag()` call from a template still
 * emits.
 *
 * Per-page PHPDOC tags, each falling back to the generic page tag:
 *
 *   @meta false            skip metadata for this page (or @meta_ignore true)
 *   @meta_title <text>     <title> / og:title / twitter:title  (default @title)
 *   @meta_description …    description / og / twitter           (default @description / @abstract / @excerpt)
 *   @meta_keywords a, b    <meta name="keywords">               (default @keywords)
 *   @meta_image <path>     og:image / twitter:image             (default @image / @ogimage)
 *   @meta_robots <rule>    <meta name="robots">                 (default @robots)
 *   @meta_type <type>      og:type                              (default @og_type)
 *   @canonical <url>       <link rel="canonical">               (default: derived from the file path + baseurl)
 *
 * Manual use from a template or an `includes` file — always emitted, `meta:`
 * block or not, and still de-duplicated against the page:
 *
 *   META::tag('twitter:image', 'https://…/card.png');   // name= or property= picked from the key
 *   META::link('icon', './favicon.svg', ['type' => 'image/svg+xml']);
 *   META::raw('<meta name="rating" content="general">');
 */
final class META
{
    /** Resolved config, once per process. */
    private static ?object $config = null;

    /** @var array{file:?string,info:object}|null Page context from the `page_info` hook. */
    private static ?array $page = null;

    /** True once inject()/tags() has run, so the injector does not emit twice. */
    private static bool $emitted = false;

    /** @var string[] Ready-made tag lines added by hand from a template. */
    private static array $extra = [];


    // -----------------------------------------------------------------------
    // Configuration
    // -----------------------------------------------------------------------

    /**
     * Resolved metadata configuration, merging the `meta:` block with the loose
     * keys of the `kirigami:` block and the `jsonld:` block.
     */
    public static function config(): object
    {
        if (self::$config !== null) return self::$config;

        $data = self::data();
        $raw  = self::metaRaw();
        $m    = is_object($raw) ? $raw : new stdClass;
        $ld   = self::jsonld();

        // Opt-in: needs a top-level `meta:` block (an empty map counts).
        $enabled = is_object($raw) || $raw === true;
        if ($enabled && isset($m->auto) && !self::truthy($m->auto)) $enabled = false;

        $lang = $m->language ?? $m->lang
            ?? ($ld->lang ?? null)
            ?? $data->lang ?? $data->language ?? 'en';

        $person = $ld->person ?? $data->person ?? null;
        $personName = is_object($person) ? ($person->name ?? null) : (is_string($person) ? $person : null);

        $twitter   = $m->twitter ?? $data->twitter ?? null;
        $twSite    = $m->twitterSite    ?? (is_object($twitter) ? ($twitter->site ?? null)    : (is_string($twitter) ? $twitter : null));
        $twCreator = $m->twitterCreator ?? (is_object($twitter) ? ($twitter->creator ?? null) : (is_string($twitter) ? $twitter : null));

        $generator = $m->generator ?? 'Kirigami';
        if (self::falsy($generator)) $generator = null;

        self::$config = (object) [
            'enabled'         => $enabled,
            'project'         => $data->project ?? $m->siteName ?? null,
            'tagline'         => $m->tagline ?? $data->tagline ?? null,
            'titleFormat'     => (string) ($m->titleFormat     ?? '{title} — {project}'),
            'titleFormatHome' => (string) ($m->titleFormatHome ?? '{project} — {tagline}'),
            'description'     => $m->description ?? $ld->description ?? $data->description ?? null,
            'keywords'        => self::arr($m->keywords ?? $ld->keywords ?? $data->keywords ?? null),
            'robots'          => $m->robots ?? 'index, follow',
            'language'        => $lang,
            'generator'       => $generator,
            'author'          => $m->author ?? $data->author ?? $personName ?? null,
            'designer'        => $m->designer ?? $data->designer ?? null,
            'themeColor'      => $m->themeColor ?? $m->themecolor ?? $data->themecolor ?? null,
            'image'           => self::absUrl($m->image ?? $ld->image ?? $ld->logo ?? $data->image ?? $data->ogimage ?? null),
            'ogType'          => $m->ogType ?? $m->ogtype ?? 'website',
            'twitterCard'     => $m->twitterCard ?? $m->twittercard ?? 'summary_large_image',
            'twitterSite'     => self::handle($twSite),
            'twitterCreator'  => self::handle($twCreator),
            'canonical'       => !isset($m->canonical) || self::truthy($m->canonical),
            'favicon'         => $m->favicon ?? null,
            'appleTouchIcon'  => $m->appleTouchIcon ?? $m->appletouchicon ?? null,
            'humans'          => $m->humans ?? null,
        ];

        return self::$config;
    }


    // -----------------------------------------------------------------------
    // Manual API
    // -----------------------------------------------------------------------

    /**
     * Adds a `<meta>` tag. The key picks the attribute: `og:*` → `property=`,
     * everything else → `name=`. An empty `$content` is a no-op.
     */
    public static function tag(string $name, ?string $content): void
    {
        $name    = trim($name);
        $content = $content === null ? '' : trim($content);
        if ($name === '' || $content === '') return;

        $attr = str_starts_with(strtolower($name), 'og:') ? 'property' : 'name';
        self::$extra[] = '<meta ' . $attr . '="' . STR::htmlesc($name) . '" content="' . STR::htmlesc($content) . '">';
    }

    /** Adds a `<link>` tag. `$attrs` are extra attributes (`type`, `sizes`, …). */
    public static function link(string $rel, string $href, array $attrs = []): void
    {
        if (trim($rel) === '' || trim($href) === '') return;
        $out = '<link rel="' . STR::htmlesc($rel) . '"';
        foreach ($attrs as $k => $v) {
            if ($v === null || $v === '' || $v === false) continue;
            $out .= ' ' . $k . '="' . STR::htmlesc((string) $v) . '"';
        }
        $out .= ' href="' . STR::htmlesc($href) . '">';
        self::$extra[] = $out;
    }

    /** Adds a verbatim tag line (already valid HTML). */
    public static function raw(string $html): void
    {
        $html = trim($html);
        if ($html !== '') self::$extra[] = $html;
    }

    /** Clears the per-render state. */
    public static function reset(): void
    {
        self::$page    = null;
        self::$emitted = false;
        self::$extra   = [];
    }


    // -----------------------------------------------------------------------
    // Output
    // -----------------------------------------------------------------------

    /**
     * The full block of tag lines (`\n`-joined), each dropped when `$html`
     * already carries an equivalent tag. `''` when there is nothing to emit.
     */
    public static function tags(string $html = ''): string
    {
        self::$emitted = true;

        $c     = self::config();
        $info  = self::pageInfo();

        /** @var array<int,array{0:string,1:string}> [probe regex, tag html] */
        $lines = [];

        // The auto block only builds when the `meta:` block opted in; an
        // explicit META::tag() call still lands through self::$extra below.
        if ($c->enabled) {
            $relroot  = self::relroot();

            $title    = self::pageTitle();
            $desc     = self::pageTag('meta_description', 'metadescription')
                        ?? ($info->description ?? $info->abstract ?? $info->excerpt ?? $info->summary ?? null);
            $desc     = is_string($desc) && trim($desc) !== '' ? trim($desc) : ($c->description ?: null);
            $keywords = self::arr(self::pageTag('meta_keywords', 'metakeywords')) ?: $c->keywords;
            $image    = self::absUrl(self::pageTag('meta_image', 'metaimage') ?? $info->image ?? $info->ogimage ?? null) ?? $c->image;
            $robots   = self::pageTag('meta_robots', 'metarobots', 'robots') ?? $c->robots;
            $ogType   = self::pageTag('meta_type', 'metatype', 'og_type', 'ogtype') ?? $c->ogType;
            $url      = self::pageTag('canonical') ?? self::pageUrl();

            if ($title) $lines[] = ['#<title[\s>]#i', '<title>' . STR::htmlesc($title) . '</title>'];

            self::name($lines, 'description', $desc);
            self::name($lines, 'keywords', $keywords ? implode(', ', $keywords) : null);
            self::name($lines, 'robots', $robots && !self::falsy($robots) ? (string) $robots : null);
            self::name($lines, 'language', $c->language);
            self::name($lines, 'generator', $c->generator);
            self::name($lines, 'author', $c->author);
            self::name($lines, 'designer', $c->designer);
            self::name($lines, 'theme-color', $c->themeColor);

            self::name($lines, 'twitter:card', $c->twitterCard);
            self::name($lines, 'twitter:title', $title);
            self::name($lines, 'twitter:description', $desc);
            self::name($lines, 'twitter:image', $image);
            self::name($lines, 'twitter:site', $c->twitterSite);
            self::name($lines, 'twitter:creator', $c->twitterCreator);

            self::prop($lines, 'og:site_name', $c->project);
            self::prop($lines, 'og:locale', $c->language ? str_replace('-', '_', $c->language) : null);
            self::prop($lines, 'og:type', $ogType);
            self::prop($lines, 'og:title', $title);
            self::prop($lines, 'og:description', $desc);
            self::prop($lines, 'og:url', $url);
            self::prop($lines, 'og:image', $image);

            if ($c->canonical && $url) {
                $lines[] = ['#<link\s+[^>]*rel\s*=\s*(["\'])canonical\1#i',
                            '<link rel="canonical" href="' . STR::htmlesc($url) . '">'];
            }

            if ($h = self::asset($c->humans, 'humans', 'humans.txt', $relroot)) {
                $lines[] = ['#<link\s+[^>]*rel\s*=\s*(["\'])author\1#i',
                            '<link rel="author" type="text/plain" href="' . STR::htmlesc($h) . '">'];
            }
            if ($f = self::asset($c->favicon, 'favicon', 'favicon.ico', $relroot)) {
                $type = str_ends_with($f, '.svg') ? 'image/svg+xml' : (str_ends_with($f, '.png') ? 'image/png' : 'image/x-icon');
                $lines[] = ['#<link\s+[^>]*rel\s*=\s*(["\'])icon\1#i',
                            '<link rel="icon" type="' . $type . '" href="' . STR::htmlesc($f) . '">'];
            }
            if ($a = self::asset($c->appleTouchIcon, 'appleTouchIcon', 'apple-touch-icon.png', $relroot)) {
                $lines[] = ['#<link\s+[^>]*rel\s*=\s*(["\'])apple-touch-icon\1#i',
                            '<link rel="apple-touch-icon" href="' . STR::htmlesc($a) . '">'];
            }
        }

        $out  = [];
        $seen = [];
        foreach ($lines as [$probe, $tag]) {
            if (isset($seen[$tag])) continue;
            if ($html !== '' && preg_match($probe, $html)) continue;
            $seen[$tag] = true;
            $out[] = $tag;
        }
        foreach (self::$extra as $tag) {
            if (isset($seen[$tag])) continue;
            $seen[$tag] = true;
            $out[] = $tag;
        }

        return implode("\n", $out);
    }


    // -----------------------------------------------------------------------
    // Render hooks (wired in prepros.plugins.php)
    // -----------------------------------------------------------------------

    /** Captures the page under render. Called from the `page_info` hook. */
    public static function capture(mixed $info): void
    {
        self::reset();
        self::$page = ['file' => PREPROS::$file ?: null, 'info' => is_object($info) ? $info : new stdClass];
    }

    /**
     * Injects the tag block right before `</head>` (after any `<meta charset>`
     * / `<title>` the layout wrote). Called from the `post_render` hook.
     */
    public static function inject(string $html): string
    {
        try {
            if (self::$emitted) return $html;
            if (self::pageOptedOut()) return $html;
            if (!self::config()->enabled && self::$extra === []) return $html;

            $block = self::tags($html);
            if ($block === '') return $html;

            $block = '    ' . str_replace("\n", "\n    ", $block) . "\n";
            return preg_match('#</head>#i', $html)
                ? preg_replace('#</head>#i', $block . '</head>', $html, 1)
                : $block . $html;
        } finally {
            self::reset();
        }
    }


    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private static function name(array &$lines, string $name, ?string $content): void
    {
        self::meta($lines, 'name', $name, $content);
    }

    private static function prop(array &$lines, string $prop, ?string $content): void
    {
        self::meta($lines, 'property', $prop, $content);
    }

    /**
     * Queues a `<meta $attr="$key" content="$content">`, with a probe that
     * matches the same key under *either* `name=` or `property=` — a layout that
     * wrote `og:title` as `name=` (or `twitter:image` as `property=`) still
     * counts as already present.
     */
    private static function meta(array &$lines, string $attr, string $key, ?string $content): void
    {
        $content = $content === null ? '' : trim($content);
        if ($content === '') return;
        $lines[] = [
            '#<meta\s+[^>]*(?:name|property)\s*=\s*(["\'])' . preg_quote($key, '#') . '\1#i',
            '<meta ' . $attr . '="' . $key . '" content="' . STR::htmlesc($content) . '">',
        ];
    }

    /** The composed page title, per `titleFormat` / `titleFormatHome`. */
    private static function pageTitle(): ?string
    {
        $c    = self::config();
        $info = self::pageInfo();
        $page = self::pageTag('meta_title', 'metatitle') ?? $info->title ?? $info->name ?? null;

        $tokens = [
            '{title}'   => is_string($page) ? trim($page) : '',
            '{project}' => (string) ($c->project ?? ''),
            '{tagline}' => (string) ($c->tagline ?? ''),
        ];

        $fmt = (!$tokens['{title}'] || $tokens['{title}'] === $tokens['{project}'])
            ? $c->titleFormatHome
            : $c->titleFormat;

        $out = strtr($fmt, $tokens);
        // Collapse separators left dangling by an empty token.
        $out = preg_replace('/\s*[|\x{2013}\x{2014}\-\/·:]\s*(?=$|[|\x{2013}\x{2014}\-\/·:])/u', '', $out);
        $out = trim(preg_replace('/^\s*[|\x{2013}\x{2014}\-\/·:]\s*|\s*[|\x{2013}\x{2014}\-\/·:]\s*$/u', '', $out));

        return $out !== '' ? $out : ($tokens['{project}'] ?: null);
    }

    /** The `kirigami:` block. */
    private static function data(): object
    {
        if (isset(PREPROS::$config) && is_object(PREPROS::$config) && isset(PREPROS::$config->data) && is_object(PREPROS::$config->data)) {
            return PREPROS::$config->data;
        }
        return new stdClass;
    }

    /** The raw top-level `meta:` block: object, `false`, `true`, or `null`. */
    private static function metaRaw(): mixed
    {
        return (isset(PREPROS::$config) && is_object(PREPROS::$config)) ? (PREPROS::$config->meta ?? null) : null;
    }

    /** The top-level `jsonld:` block as an object (empty when absent / disabled). */
    private static function jsonld(): object
    {
        $raw = (isset(PREPROS::$config) && is_object(PREPROS::$config)) ? (PREPROS::$config->jsonld ?? null) : null;
        return is_object($raw) ? $raw : new stdClass;
    }

    private static function pageInfo(): object
    {
        return self::$page['info'] ?? new stdClass;
    }

    /** First non-empty, non-boolean value among the given PHPDOC tag names. */
    private static function pageTag(string ...$names): ?string
    {
        $info = self::pageInfo();
        foreach ($names as $n) {
            $v = $info->$n ?? null;
            if (is_string($v) && trim($v) !== '' && !self::truthy($v) && !self::falsy($v)) return trim($v);
        }
        return null;
    }

    /** `@meta false` / `@meta_ignore true` → skip this page. */
    private static function pageOptedOut(): bool
    {
        $info = self::pageInfo();
        $v = $info->meta ?? null;
        if (is_string($v) && self::falsy($v)) return true;
        return isset($info->meta_ignore) && self::truthy($info->meta_ignore);
    }

    /** Absolute URL of the page currently under render (mirrors PREPROS::render()). */
    private static function pageUrl(): ?string
    {
        $data = self::data();
        $file = self::$page['file'] ?? (PREPROS::$file ?: null);
        if (!$file || empty($data->baseurl)) return null;

        $root = @realpath(PREPROS::$config->root ?? '') ?: (PREPROS::$config->root ?? '');
        $abs  = @realpath($file) ?: $file;
        $rel  = str_replace('\\', '/', pathinfo(str_replace($root, '', $abs), PATHINFO_DIRNAME));

        $basepath = rtrim((string) parse_url($data->baseurl, PHP_URL_PATH), '/');
        $path     = preg_replace('#/+#', '/', $basepath . '/' . trim($rel, '/') . '/');
        $origin   = preg_replace('#^(https?://[^/]+).*#', '$1', (string) $data->baseurl);

        return $origin . $path;
    }

    /** Path from the page's directory back to the source root, e.g. `../` or `./`. */
    private static function relroot(): string
    {
        $file = self::$page['file'] ?? (PREPROS::$file ?: '');
        if ($file === '') return './';
        $dir  = str_replace('\\', '/', dirname((string) (@realpath($file) ?: $file))) . '/';
        $root = str_replace('\\', '/', (string) (@realpath(PREPROS::$config->root ?? '') ?: (PREPROS::$config->root ?? ''))) . '/';
        return FS::getRelativePath($dir, $root);
    }

    /**
     * Resolves an asset link: an explicit string is used as-is (page-relative
     * when it is a bare filename); `true` forces the default file; `null`
     * auto-detects the default file at the source root (presence reported by
     * `prepros.js` via `metaFiles`, since these extensions are not mounted);
     * `false` disables it.
     */
    private static function asset(mixed $value, string $key, string $default, string $relroot): ?string
    {
        if (self::falsy($value)) return null;

        if (is_string($value) && trim($value) !== '') {
            $v = trim($value);
            if (preg_match('#^(https?:)?//#', $v) || str_starts_with($v, '/') || str_starts_with($v, '.')) return $v;
            return rtrim($relroot, '/') . '/' . ltrim($v, '/');
        }

        if ($value === true) return rtrim($relroot, '/') . '/' . $default;

        $files = (isset(PREPROS::$config) && is_object(PREPROS::$config)) ? (PREPROS::$config->metaFiles ?? null) : null;
        $found = is_object($files) ? ($files->$key ?? false) : false;
        if (!$found) {
            // Fall back to a direct check, for files that do live in the sandbox.
            $root = (string) (@realpath(PREPROS::$config->root ?? '') ?: (PREPROS::$config->root ?? ''));
            $found = $root !== '' && is_file($root . '/' . $default);
        }
        return $found ? rtrim($relroot, '/') . '/' . $default : null;
    }

    /** Turns a relative path into an absolute URL against `baseurl`. */
    private static function absUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') return null;
        $url = trim($url);
        if (preg_match('#^(https?:)?//#', $url) || str_starts_with($url, 'data:')) return $url;

        $origin = preg_replace('#^(https?://[^/]+).*#', '$1', (string) (self::data()->baseurl ?? ''));
        return $origin === '' ? $url : $origin . '/' . ltrim($url, '/');
    }

    /** `@user` / `user` / `https://twitter.com/user` → `@user`. */
    private static function handle(mixed $v): ?string
    {
        if (!is_string($v) || trim($v) === '') return null;
        $v = trim($v);
        if (preg_match('#(?:twitter|x)\.com/@?([A-Za-z0-9_]{1,15})#i', $v, $m)) return '@' . $m[1];
        return '@' . ltrim($v, '@');
    }

    /** @return array<int,string> */
    private static function arr(mixed $v): array
    {
        if ($v === null || $v === '') return [];
        if (is_array($v)) return array_values(array_filter(array_map(fn($x) => trim((string) $x), $v), fn($x) => $x !== ''));
        if (is_object($v)) return self::arr((array) $v);
        // A scalar string: split a comma-separated list, else keep as one item.
        $s = trim((string) $v);
        return str_contains($s, ',') ? self::arr(array_map('trim', explode(',', $s))) : ($s === '' ? [] : [$s]);
    }

    private static function truthy(mixed $v): bool
    {
        if (is_bool($v)) return $v;
        return in_array(strtolower(trim((string) $v)), ['1', 'true', 'yes', 'on'], true);
    }

    private static function falsy(mixed $v): bool
    {
        if (is_bool($v)) return !$v;
        return in_array(strtolower(trim((string) $v)), ['0', 'false', 'no', 'off'], true);
    }
}
