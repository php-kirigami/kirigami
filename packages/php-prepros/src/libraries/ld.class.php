<?php

declare(strict_types=1);

/**
 * LD — schema.org JSON-LD generator.
 *
 * Collects schema.org nodes during a render and emits them as a single
 * `<script type="application/ld+json">` block in the page `<head>`, built from
 * the top-level `jsonld:` block of `kirigami.yaml` and the loose keys of the
 * `kirigami:` block (`person`, `jobtitle`, `area`, `knowsabout`, `keywords`,
 * `facebook`, … that Kirigami projects already use).
 *
 * Two ways to use it, and they combine:
 *
 *  1. Automatic — opt-in. As soon as `kirigami.yaml` carries a top-level
 *     `jsonld:` block (even an empty one, `jsonld: {}`), a `post_render` hook
 *     injects an `Organization` (+ `Person`, `WebSite`, `WebPage`, and a
 *     `BreadcrumbList` built from the `_index.php` ancestor trail) `@graph`
 *     derived from the block, the loose keys and the current page's PHPDOC.
 *     Without a `jsonld:` block nothing is injected. Turn it back off with
 *     `jsonld: false` (or `jsonld: { auto: false }`), or per page with
 *     `@ld false` in the template's PHPDOC. A page that already hand-writes an
 *     `application/ld+json` script is left untouched.
 *
 *     Per-page PHPDOC tags feed the page node:
 *       @ld false           skip JSON-LD for this page (or @ld_ignore true)
 *       @ld_type <Type>     page node @type (AboutPage, ContactPage, Article, …)
 *       @ld_title <text>    page node name        (default @title)
 *       @ld_description …   page node description  (default @description)
 *       @ld_image <path>    page image            (default @image / @ogimage)
 *       @ld_published <d>   datePublished         (default @datePublished)
 *       @ld_modified <d>    dateModified
 *       @ld_breadcrumb false   no BreadcrumbList for this page
 *
 *  2. Explicit. Call the builders from a template or from an `includes` file.
 *     Nodes added this way are always emitted, `jsonld:` block or not:
 *
 *       LD::add('Recipe', [ 'name' => 'Tarte', 'recipeYield' => '6' ]);
 *       LD::article([ 'headline' => $title, 'author' => LD::ref('#person') ]);
 *       LD::faqPage([ 'Question ?' => 'Réponse.' ]);
 *
 *     Every schema.org type is reachable as `LD::typeName([...])` through
 *     `__callStatic` (`LD::musicAlbum([...])` → `{"@type":"MusicAlbum",…}`).
 *     Named builders (`organization`, `person`, `website`, `webPage`,
 *     `breadcrumb`, `faqPage`) additionally pre-fill config/context defaults.
 *
 * Nodes carrying a stable `@id` (`#organization`, `#website`, …) are merged on
 * repeat calls, so a template can refine what the automatic pass produced.
 */
final class LD
{
    /** Known loose social keys collected into Organization.sameAs. */
    private const SOCIAL = [
        'facebook', 'instagram', 'twitter', 'x', 'linkedin', 'github',
        'youtube', 'mastodon', 'threads', 'tiktok', 'bluesky', 'pinterest',
        'snapchat', 'soundcloud', 'bandcamp', 'vimeo', 'medium', 'behance',
        'dribbble', 'twitch',
    ];

    /** @var array<string|int,array<string,mixed>> Graph nodes for the current render, keyed by @id (or int). */
    private static array $graph = [];

    /** @var array{file:?string,info:object}|null Page context captured from the `page_info` hook. */
    private static ?array $page = null;

    /** True once script()/json() has run, so the injector does not emit twice. */
    private static bool $emitted = false;

    /** Normalized config, resolved once per process. */
    private static ?object $config = null;


    // -----------------------------------------------------------------------
    // Configuration
    // -----------------------------------------------------------------------

    /**
     * Resolved JSON-LD configuration, merging the `jsonld:` block with the
     * loose top-level keys of the `kirigami:` block.
     */
    public static function config(): object
    {
        if (self::$config !== null) return self::$config;

        $data = self::data();
        $raw  = self::jsonldRaw();
        $j    = is_object($raw) ? $raw : new stdClass;

        // Automatic injection is opt-in: it needs a top-level `jsonld:` block (an
        // empty map counts). `jsonld: false` / `jsonld: { auto: false }` turn it off.
        $enabled = is_object($raw) || $raw === true;
        if ($enabled && isset($j->auto) && !self::truthy($j->auto)) $enabled = false;

        $sameAs = [];
        if (isset($j->sameAs) && is_array($j->sameAs)) $sameAs = array_map('strval', $j->sameAs);
        foreach ((array) $data as $k => $v) {
            if (is_string($v) && STR::is_url($v) && in_array(strtolower((string) $k), self::SOCIAL, true)) {
                $sameAs[] = $v;
            }
        }
        $sameAs = array_values(array_unique($sameAs));

        $person = null;
        if (isset($j->person)) {
            $person = is_object($j->person) ? (array) $j->person : ['name' => (string) $j->person];
        } elseif (!empty($data->person)) {
            $person = [
                'name'     => (string) $data->person,
                'jobTitle' => $data->jobtitle ?? $data->jobTitle ?? null,
                'email'    => $data->email ?? null,
            ];
        }
        if (is_array($person)) {
            if (isset($person['jobtitle']) && !isset($person['jobTitle'])) $person['jobTitle'] = $person['jobtitle'];
            unset($person['jobtitle']);
            $person = array_filter($person, fn($v) => $v !== null && $v !== '');
        }

        self::$config = (object) [
            'enabled'     => $enabled,
            'type'        => $j->type ?? 'Organization',
            'name'        => $j->name ?? $data->project ?? null,
            'url'         => rtrim((string) ($j->url ?? $data->baseurl ?? ''), '/') . '/',
            'description' => $j->description ?? $data->description ?? null,
            'logo'        => self::absUrl($j->logo ?? null),
            'image'       => self::absUrl($j->image ?? $j->logo ?? null),
            'sameAs'      => $sameAs,
            'email'       => $j->email ?? $data->email ?? null,
            'telephone'   => $j->telephone ?? $data->telephone ?? $data->phone ?? null,
            'address'     => isset($j->address) ? (is_object($j->address) ? (array) $j->address : $j->address) : null,
            'areaServed'  => $j->areaServed ?? $data->area ?? null,
            'knowsAbout'  => self::arr($j->knowsAbout ?? $data->knowsabout ?? $data->knowsAbout ?? null),
            'keywords'    => self::arr($j->keywords ?? $data->keywords ?? null),
            'person'      => $person ?: null,
            'lang'        => $j->lang ?? $data->lang ?? $data->language ?? 'en',
            'search'      => $j->search ?? null,
        ];

        return self::$config;
    }


    // -----------------------------------------------------------------------
    // Graph primitives
    // -----------------------------------------------------------------------

    /**
     * Builds a bare node — `['@type' => $type]` plus `$props`, recursively
     * pruned of null / '' / [] values. Does not touch the graph.
     *
     * @param  string|array<string>  $type
     * @param  array<string,mixed>   $props
     * @return array<string,mixed>
     */
    public static function node(string|array $type, array $props = []): array
    {
        $node = [];
        if ($type !== '' && $type !== []) $node['@type'] = $type;
        if (isset($props['@id'])) { $node['@id'] = $props['@id']; unset($props['@id']); }
        foreach ($props as $k => $v) $node[$k] = $v;

        return self::clean($node);
    }

    /**
     * Builds a node and registers it in the `@graph`. A node with an `@id`
     * (passed as `$id` or inside `$props`) is merged into any existing node
     * with the same id; otherwise it is appended.
     *
     * @param  string|array<string>  $type
     * @param  array<string,mixed>   $props
     * @return array<string,mixed>   The stored node.
     */
    public static function add(string|array $type, array $props = [], ?string $id = null): array
    {
        $node = self::node($type, $props);
        $key  = $id ?? ($node['@id'] ?? null);

        if ($key !== null) {
            self::$graph[$key] = isset(self::$graph[$key])
                ? self::merge(self::$graph[$key], $node)
                : $node;
            return self::$graph[$key];
        }

        self::$graph[] = $node;
        return $node;
    }

    /** Appends an already-built node to the graph. */
    public static function push(array $node): array
    {
        $node = self::clean($node);
        $key  = $node['@id'] ?? null;
        if ($key !== null) {
            self::$graph[$key] = isset(self::$graph[$key]) ? self::merge(self::$graph[$key], $node) : $node;
            return self::$graph[$key];
        }
        self::$graph[] = $node;
        return $node;
    }

    /** `['@id' => …]` reference. `#organization` → the site's Organization node. */
    public static function ref(string $id): array
    {
        return ['@id' => self::id($id)];
    }

    /** Drops a node from the graph by its `@id` (fragment form accepted). */
    public static function remove(string $id): void
    {
        unset(self::$graph[self::id($id)], self::$graph[$id]);
    }

    /** The graph as a plain list, in insertion order. */
    public static function graph(): array
    {
        return array_values(self::$graph);
    }

    /** Clears the per-render state (graph, page context, emitted flag). */
    public static function reset(): void
    {
        self::$graph   = [];
        self::$page    = null;
        self::$emitted = false;
    }

    /**
     * Every other schema.org type: `LD::recipe([...])`, `LD::jobPosting([...])`,
     * `LD::softwareApplication([...])`. The method name is upper-cased on its
     * first letter to form the `@type`.
     *
     * @param  array{0?:array<string,mixed>,1?:string} $args
     * @return array<string,mixed>
     */
    public static function __callStatic(string $name, array $args): array
    {
        $props = (isset($args[0]) && is_array($args[0])) ? $args[0] : [];
        $id    = (isset($args[1]) && is_string($args[1])) ? $args[1] : null;
        return self::add(ucfirst($name), $props, $id);
    }


    // -----------------------------------------------------------------------
    // Config-aware builders
    // -----------------------------------------------------------------------

    /** The site's main entity (`Organization` by default; `jsonld.type` overrides). */
    public static function organization(array $overrides = []): array
    {
        $c = self::config();

        $node = [
            '@id'         => self::id('#organization'),
            'name'        => $c->name,
            'url'         => self::home(),
            'description' => $c->description,
            'email'       => $c->email,
            'telephone'   => $c->telephone,
            'sameAs'      => $c->sameAs ?: null,
            'knowsAbout'  => $c->knowsAbout ?: null,
            'areaServed'  => $c->areaServed,
        ];
        if ($c->logo) {
            $node['logo']  = self::image($c->logo, '#logo');
            $node['image'] = self::ref('#logo');
        }
        if ($c->address) $node['address'] = self::address($c->address);
        if ($c->person)  $node['founder'] = self::ref('#person');

        return self::add($overrides['@type'] ?? $c->type ?? 'Organization', array_merge($node, $overrides));
    }

    /** The key `Person` behind the site, linked to the Organization. */
    public static function person(array $overrides = []): array
    {
        $c = self::config();
        if (!$c->person) return [];

        $p = $c->person;
        $node = [
            '@id'      => self::id('#person'),
            'name'     => $p['name'] ?? $c->name,
            'jobTitle' => $p['jobTitle'] ?? null,
            'email'    => $p['email'] ?? null,
            'url'      => $p['url'] ?? self::home(),
            'sameAs'   => $p['sameAs'] ?? null,
            'worksFor' => self::ref('#organization'),
        ];
        unset($p['name'], $p['jobTitle'], $p['email'], $p['url'], $p['sameAs']);

        return self::add('Person', array_merge($node, $p, $overrides));
    }

    /** The `WebSite` node (publisher → Organization, optional search action). */
    public static function website(array $overrides = []): array
    {
        $c = self::config();

        $node = [
            '@id'         => self::id('#website'),
            'url'         => self::home(),
            'name'        => $c->name,
            'description' => $c->description,
            'inLanguage'  => $c->lang,
            'publisher'   => self::ref('#organization'),
        ];
        if ($c->keywords) $node['keywords'] = implode(', ', $c->keywords);
        if ($c->search)   $node['potentialAction'] = self::searchAction($c->search);

        return self::add('WebSite', array_merge($node, $overrides));
    }

    /**
     * The current page's node, built from its PHPDOC. Reads, in order of
     * precedence, the `@ld_*` tags then the generic page tags:
     *
     *   @ld_type <Type>     the node's `@type`      (default `WebPage`; also `@ldtype`, `@jsonld`)
     *   @ld_title <text>    the node's `name`       (default `@title`)
     *   @ld_description …   the node's `description` (default `@description`)
     *   @ld_image <path>    the page image          (default `@image` / `@ogimage`)
     *   @ld_published <d>   `datePublished`         (default `@datePublished` / `@published` / `@date`)
     *   @ld_modified <d>    `dateModified`          (default `@dateModified` / `@modified` / `@updated`)
     *
     * `LD::webPage(['@type' => …, …])` overrides everything.
     */
    public static function webPage(array $overrides = []): array
    {
        $c    = self::config();
        $info = self::pageInfo();
        $url  = self::pageUrl() ?? self::home();

        $type = $overrides['@type']
            ?? self::pageTag('ld_type', 'ldtype', 'jsonld')
            ?? 'WebPage';
        if (self::truthy($type) || self::falsy($type)) $type = 'WebPage';   // `@jsonld true`
        unset($overrides['@type']);

        $isPageType = stripos((string) $type, 'page') !== false;

        $node = [
            '@id'           => $url . '#webpage',
            'url'           => $url,
            'name'          => self::pageTag('ld_title', 'ldtitle') ?? $info->title ?? $c->name,
            // Page description: the page's own only — no fall-back to the site
            // description, which would clone it onto every page.
            'description'   => self::pageTag('ld_description', 'lddescription')
                                ?? $info->description ?? $info->desclong ?? $info->descshort ?? null,
            'isPartOf'      => self::ref('#website'),
            'about'         => self::ref('#organization'),
            'inLanguage'    => $c->lang,
            'datePublished' => self::pageTag('ld_published', 'ldpublished')
                                ?? $info->datePublished ?? $info->published ?? $info->date ?? null,
            'dateModified'  => self::pageTag('ld_modified', 'ldmodified')
                                ?? $info->dateModified ?? $info->modified ?? $info->updated ?? null,
        ];

        $img = self::pageTag('ld_image', 'ldimage') ?? $info->image ?? $info->ogimage ?? null;
        if ($img) {
            $node[$isPageType ? 'primaryImageOfPage' : 'image'] = self::image(self::absUrl((string) $img));
        }

        if ($isPageType && isset(self::$graph[$url . '#breadcrumb'])) {
            $node['breadcrumb'] = self::ref($url . '#breadcrumb');
        }

        return self::add($type, array_merge($node, $overrides));
    }

    /**
     * A `BreadcrumbList`. With no argument it is derived from the page's
     * ancestor `_index.php` trail (always attempted while the `jsonld:` block
     * is on — no `@breadcrumb` opt-in needed; disable per page with
     * `@ld_breadcrumb false`). Pass `$items` as `[['name' => …, 'url' => …], …]`
     * to build it by hand.
     */
    public static function breadcrumb(?array $items = null, array $overrides = []): array
    {
        if ($items === null) {
            $info = self::pageInfo();
            if (isset($info->ld_breadcrumb) && self::falsy($info->ld_breadcrumb)) return [];
            $items = self::autoBreadcrumb();
            if (count($items) < 2) return [];
        }

        $elements = [];
        $pos = 1;
        foreach ($items as $it) {
            $entry = ['@type' => 'ListItem', 'position' => $pos++, 'name' => $it['name'] ?? null];
            if (!empty($it['url'])) $entry['item'] = $it['url'];
            $elements[] = self::clean($entry);
        }

        $url = self::pageUrl() ?? self::home();
        return self::add('BreadcrumbList', array_merge([
            '@id'             => $url . '#breadcrumb',
            'itemListElement' => $elements,
        ], $overrides));
    }

    /**
     * An `FAQPage`. `$qa` maps a question to its answer string, or to an
     * array of extra `Question` properties.
     *
     * @param  array<string,string|array<string,mixed>> $qa
     */
    public static function faqPage(array $qa, array $overrides = []): array
    {
        $entities = [];
        foreach ($qa as $q => $a) {
            if (is_array($a)) {
                $entities[] = self::clean(array_merge(['@type' => 'Question', 'name' => (string) $q], $a));
                continue;
            }
            $entities[] = [
                '@type'          => 'Question',
                'name'           => (string) $q,
                'acceptedAnswer' => ['@type' => 'Answer', 'text' => (string) $a],
            ];
        }

        return self::add('FAQPage', array_merge(['mainEntity' => $entities], $overrides));
    }


    // -----------------------------------------------------------------------
    // Value-object helpers (return a node, do not touch the graph)
    // -----------------------------------------------------------------------

    /** `PostalAddress` from a string or an associative array. */
    public static function address(array|string $a): array
    {
        if (is_string($a)) return ['@type' => 'PostalAddress', 'streetAddress' => $a];
        return self::clean(array_merge(['@type' => 'PostalAddress'], $a));
    }

    /** `ImageObject`; a relative `$url` is resolved against `baseurl`. */
    public static function image(string $url, ?string $id = null, ?int $width = null, ?int $height = null): array
    {
        $url = self::absUrl($url);
        return self::clean([
            '@type'      => 'ImageObject',
            '@id'        => $id ? self::id($id) : null,
            'url'        => $url,
            'contentUrl' => $url,
            'width'      => $width,
            'height'     => $height,
        ]);
    }

    /** `GeoCoordinates`. */
    public static function geo(float $lat, float $lng): array
    {
        return ['@type' => 'GeoCoordinates', 'latitude' => $lat, 'longitude' => $lng];
    }

    /** `AggregateRating`. */
    public static function rating(int|float $value, ?int $count = null, int|float $best = 5, int|float $worst = 1): array
    {
        return self::clean([
            '@type'       => 'AggregateRating',
            'ratingValue' => $value,
            'ratingCount' => $count,
            'bestRating'  => $best,
            'worstRating' => $worst,
        ]);
    }

    /** `Offer`. */
    public static function offer(array $o): array
    {
        return self::clean(array_merge(['@type' => 'Offer'], $o));
    }

    /** `ContactPoint`. */
    public static function contactPoint(array $c): array
    {
        return self::clean(array_merge(['@type' => 'ContactPoint'], $c));
    }

    /** `SearchAction` for a `WebSite` sitelinks search box. */
    public static function searchAction(string $urlTemplate): array
    {
        return [
            '@type'       => 'SearchAction',
            'target'      => ['@type' => 'EntryPoint', 'urlTemplate' => $urlTemplate],
            'query-input' => 'required name=search_term_string',
        ];
    }


    // -----------------------------------------------------------------------
    // Output
    // -----------------------------------------------------------------------

    /** The `<script type="application/ld+json">…</script>` block, or `''`. */
    public static function script(bool $pretty = true): string
    {
        $json = self::json($pretty);
        if ($json === '') return '';
        return '<script type="application/ld+json">' . "\n" . $json . "\n" . '</script>';
    }

    /** The JSON-LD document as a string (`@graph` when there is more than one node). */
    public static function json(bool $pretty = true): string
    {
        if (self::$graph === [] && self::config()->enabled && !self::pageOptedOut()) self::autofill();

        $nodes = array_values(array_filter(self::$graph, fn($n) => count($n) > 1));
        if ($nodes === []) return '';
        self::$emitted = true;

        $doc = count($nodes) === 1
            ? array_merge(['@context' => 'https://schema.org'], $nodes[0])
            : ['@context' => 'https://schema.org', '@graph' => $nodes];

        $flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | ($pretty ? JSON_PRETTY_PRINT : 0);
        return json_encode($doc, $flags);
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
     * Injects the automatic `<script>` right before `</head>`. Called from the
     * `post_render` hook. Skips pages that already carry an
     * `application/ld+json` script, or that opted out.
     */
    public static function inject(string $html): string
    {
        try {
            if (self::$emitted)                                        return $html;
            if (self::pageOptedOut())                                  return $html;
            if (stripos($html, 'application/ld+json') !== false)       return $html;

            // script() autofills the defaults only when the `jsonld:` block
            // opted in; otherwise it emits nothing unless a template added
            // nodes by hand, in which case those are still injected.
            $script = self::script();
            if ($script === '') return $html;

            $block = '    ' . str_replace("\n", "\n    ", $script) . "\n";
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

    private static function autofill(): void
    {
        $c = self::config();
        self::organization();
        if ($c->person) self::person();
        self::website();
        self::breadcrumb();
        self::webPage();
    }

    /** The `kirigami:` block (`PREPROS::$config->data`), or an empty object outside a render. */
    private static function data(): object
    {
        if (isset(PREPROS::$config) && is_object(PREPROS::$config) && isset(PREPROS::$config->data) && is_object(PREPROS::$config->data)) {
            return PREPROS::$config->data;
        }
        return new stdClass;
    }

    /** The raw top-level `jsonld:` block: an object, `false`, `true`, or `null` when absent. */
    private static function jsonldRaw(): mixed
    {
        return (isset(PREPROS::$config) && is_object(PREPROS::$config)) ? (PREPROS::$config->jsonld ?? null) : null;
    }

    private static function pageInfo(): object
    {
        return self::$page['info'] ?? new stdClass;
    }

    /** First non-empty value among the given PHPDOC tag names of the current page. */
    private static function pageTag(string ...$names): ?string
    {
        $info = self::pageInfo();
        foreach ($names as $n) {
            $v = $info->$n ?? null;
            if (is_string($v) && trim($v) !== '' && !self::truthy($v) && !self::falsy($v)) return trim($v);
        }
        return null;
    }

    /** `@ld false` / `@jsonld false` / `@ld_ignore` → skip this page entirely. */
    private static function pageOptedOut(): bool
    {
        $info = self::pageInfo();
        foreach (['ld', 'jsonld'] as $t) {
            $v = $info->$t ?? null;
            if (is_string($v) && self::falsy($v)) return true;
        }
        return isset($info->ld_ignore) && self::truthy($info->ld_ignore);
    }

    /** Site origin + base path + trailing slash, e.g. `https://example.com/`. */
    private static function home(): string
    {
        $base = (string) (self::data()->baseurl ?? self::config()->url);
        return $base === '' ? '/' : rtrim($base, '/') . '/';
    }

    /** Absolute URL of the page currently under render. */
    private static function pageUrl(): ?string
    {
        $file = self::$page['file'] ?? (PREPROS::$file ?: null);
        return $file ? self::urlForFile($file) : null;
    }

    /** Absolute URL of the directory holding a source file (mirrors PREPROS::render()). */
    private static function urlForFile(string $file): ?string
    {
        $data = self::data();
        if (empty($data->baseurl)) return null;

        $root = @realpath(PREPROS::$config->root ?? '') ?: (PREPROS::$config->root ?? '');
        $abs  = @realpath($file) ?: $file;
        $rel  = str_replace('\\', '/', pathinfo(str_replace($root, '', $abs), PATHINFO_DIRNAME));

        $basepath = rtrim((string) parse_url($data->baseurl, PHP_URL_PATH), '/');
        $path     = preg_replace('#/+#', '/', $basepath . '/' . trim($rel, '/') . '/');
        $origin   = preg_replace('#^(https?://[^/]+).*#', '$1', (string) $data->baseurl);

        return $origin . $path;
    }

    /**
     * Breadcrumb items for the current page: a leading home crumb, the ancestor
     * `_index.php` trail, then the page itself. `[]` for the site home page.
     *
     * @return array<int,array{name:?string,url:?string}>
     */
    private static function autoBreadcrumb(): array
    {
        $file = self::$page['file'] ?? (PREPROS::$file ?: null);
        if (!$file) return [];

        // The site's home URL, base path included (e.g. .../template-demo/).
        $siteRoot = self::config()->url;
        $pageUrl  = self::pageUrl();
        if ($pageUrl !== null && rtrim($pageUrl, '/') === rtrim($siteRoot, '/')) return [];

        $trail = [];
        try {
            $trail = self::ancestorTrail($file);
        } catch (\Throwable) {
            $trail = [];
        }

        // Guarantee a leading home crumb (the ancestor walk already yields it
        // when a root `_index.php` exists).
        if (!$trail || rtrim((string) ($trail[0]['url'] ?? ''), '/') !== rtrim($siteRoot, '/')) {
            array_unshift($trail, ['name' => self::config()->name, 'url' => $siteRoot]);
        }

        $info = self::pageInfo();
        $trail[] = [
            'name' => $info->ld_title ?? $info->title ?? $info->name ?? null,
            'url'  => $pageUrl,
        ];

        return $trail;
    }

    /**
     * Walks the source tree upward from a page file, collecting one crumb per
     * ancestor directory that holds an `_index.php` — the section index pages.
     * For a non-index page (`_post.php`), its own folder's `_index.php` counts
     * as the nearest ancestor. Ordered top-most first. No `@breadcrumb` opt-in.
     *
     * @return array<int,array{name:?string,url:?string}>
     */
    private static function ancestorTrail(string $file): array
    {
        $root = @realpath(PREPROS::$config->root ?? '');
        if (!$root) return [];
        $root = rtrim(str_replace('\\', '/', $root), '/');

        $self     = @realpath($file) ?: $file;
        $selfNorm = str_replace('\\', '/', $self);
        $startDir = str_replace('\\', '/', dirname($self));
        $isIndex  = strtolower(pathinfo($self, PATHINFO_FILENAME)) === '_index';

        $dir   = rtrim($isIndex ? dirname($startDir) : $startDir, '/');
        $trail = [];

        for ($guard = 0; $guard < 50; $guard++) {
            if (strncmp($dir . '/', $root . '/', strlen($root) + 1) !== 0) break;

            $index = $dir . '/_index.php';
            if (is_file($index) && (str_replace('\\', '/', @realpath($index) ?: $index)) !== $selfNorm) {
                $info = FS::phpFileInfo($index) ?: new stdClass;
                $fallback = $dir === $root ? self::config()->name : self::humanize(basename($dir));
                $trail[] = [
                    'name' => $info->ld_title ?? $info->title ?? $info->name ?? $fallback,
                    'url'  => self::urlForFile($index),
                ];
            }

            if ($dir === $root) break;
            $dir = rtrim(str_replace('\\', '/', dirname($dir)), '/');
        }

        return array_reverse($trail);
    }

    /** `mon-dossier` → `Mon dossier`. */
    private static function humanize(string $s): string
    {
        return ucfirst(trim(str_replace(['-', '_'], ' ', $s)));
    }

    /** Resolves a fragment (`#organization`) or bare path against `config()->url`. */
    private static function id(string $frag): string
    {
        if (preg_match('#^https?://#', $frag)) return $frag;
        $base = rtrim(self::config()->url, '/');
        return str_starts_with($frag, '#') ? $base . '/' . $frag : $base . '/' . ltrim($frag, '/');
    }

    /** Turns a relative path into an absolute URL against `baseurl`. */
    private static function absUrl(?string $url): ?string
    {
        if ($url === null || $url === '') return null;
        if (preg_match('#^(https?:)?//#', $url) || str_starts_with($url, 'data:')) return $url;

        $origin = preg_replace('#^(https?://[^/]+).*#', '$1', (string) (self::data()->baseurl ?? ''));
        return $origin . '/' . ltrim($url, '/');
    }

    /** @return array<int,string> */
    private static function arr(mixed $v): array
    {
        if ($v === null || $v === '') return [];
        if (is_array($v)) return array_values(array_map('strval', $v));
        return [(string) $v];
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

    /** Recursively drops null / '' / [] values; trims strings. */
    private static function clean(mixed $v): mixed
    {
        if (is_array($v)) {
            $list = array_is_list($v);
            $out  = [];
            foreach ($v as $k => $item) {
                $item = self::clean($item);
                if ($item === null || $item === '' || $item === []) continue;
                if ($list) $out[] = $item;
                else       $out[$k] = $item;
            }
            return $out;
        }
        if (is_string($v)) return trim($v);
        return $v;
    }

    /** Deep-merges $b into $a: scalars and lists overwrite, maps merge. */
    private static function merge(array $a, array $b): array
    {
        foreach ($b as $k => $v) {
            if (is_array($v) && !array_is_list($v) && isset($a[$k]) && is_array($a[$k]) && !array_is_list($a[$k])) {
                $a[$k] = self::merge($a[$k], $v);
            } else {
                $a[$k] = $v;
            }
        }
        return $a;
    }
}
