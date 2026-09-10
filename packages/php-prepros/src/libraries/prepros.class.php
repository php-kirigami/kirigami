<?php


final class PREPROS
{

    public  static mixed  $config;
    public  static string $file  = '';
    private static string $root  = '';
    private static array  $files = [];
    private static array  $hooks = [];
    private static array  $tags  = [];


    public static function loadConfig(object $config)
    {
        self::$config = $config;
        self::$root = realpath($config->root) . S;
        if (!empty($config->includes)) foreach ($config->includes as $path) {
            if (!is_file(realpath(self::$root . $path))) continue;
            else include_once(realpath(self::$root . $path));
        }
        // Plugin-contributed PHP (kiri 'prepros:php' hook): absolute virtual
        // paths, mounted outside the project by @kirigami/php-prepros.
        if (!empty($config->phpIncludes)) foreach ($config->phpIncludes as $path) {
            if (is_file($path)) include_once($path);
        }
    }


    public static function render(string $file)
    {
        $dir = pathinfo($file, PATHINFO_DIRNAME) . S;
        $target = $dir . ltrim(pathinfo($file, PATHINFO_FILENAME), '_') . '.html';
        if(!$file = realpath($file)) return false;
        self::$file = $file;
        
        // absolute URL path of the page's dir, prefixed with the baseurl's
        // subpath (if any) so it stays valid when the site is deployed under a
        // subfolder, e.g. https://kirigami.github.io/template/
        $basepath = rtrim((string)parse_url(self::$config->data->baseurl, PHP_URL_PATH), '/');
        $reldir = str_replace('\\', '/', pathinfo(str_replace(realpath(self::$root), '', $file), PATHINFO_DIRNAME));
        $absurl = preg_replace('#/+#', '/', $basepath . '/' . trim($reldir, '/') . '/');
        
        $relroot = FS::getRelativePath($dir, self::$root);
        $page = self::processHook('page_info', [$file, FS::phpFileInfo($file)]);

        extract((array)self::$config->data);
        extract((array)$page);

        self::processHook('pre_render', file_get_contents($file));

        ob_start();
        self::processHook('pre_before', self::$config->before);
        if (self::$config->before) include(realpath(self::$root . self::$config->before));
        $header = self::processHook('post_before', ob_get_clean());

        if(empty($content)) {
            ob_start();
            include($file);
            $body = ob_get_clean();
        } else $body = $content;

        if (!empty($indent)) {
            $body = join(PHP_EOL, array_map(function ($line) use ($indent) {
                return str_repeat(' ', $indent) . $line;
            }, explode(PHP_EOL, $body)));
        }

        ob_start();
        self::processHook('pre_after', self::$config->after);
        if (self::$config->after) include(realpath(self::$root . self::$config->after));
        $footer = self::processHook('post_after', ob_get_clean());

        $contents = $header . $body . $footer;
        $contents = self::processTags($contents);
        $contents = self::processHook('post_render', $contents);

        if ((self::$config->head ?? true) !== false) {
            $contents = self::injectHead($contents, $relroot);
        }

        if(!empty(self::$config->format)) $contents = HTML::format($contents);

        $contents = self::replaceTokens($contents);

        file_put_contents($target, $contents);
        self::exportFile($target);
        self::$file = '';
        return realpath($target);
    }


    public static function sitemap()
    {
        $paths = [];
        $root = realpath(self::$root);
        foreach (FS::dig($root . '/_index.php') as $file) {
            $parent = pathinfo(pathinfo($file, PATHINFO_DIRNAME), PATHINFO_BASENAME);
            if (strpos($parent, '_') === 0) continue;
            if (strpos(pathinfo($file, PATHINFO_FILENAME), '_') !== 0) continue;
            $paths[] = str_replace('\\', '/', ltrim(str_replace($root, '', pathinfo(realpath($file), PATHINFO_DIRNAME)), DIRECTORY_SEPARATOR));
        }
        if (empty($paths)) $paths[] = '';
        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;
        $urlset = $dom->createElementNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'urlset');
        $dom->appendChild($urlset);

        foreach ($paths as $path) {
            $deep = $path ? count(explode('/', $path)) : 0;
            $priority = sprintf('%0.1f', (10 - $deep) / 10);
            $url = rtrim(self::$config->data->baseurl, '/') . '/' . ltrim(($path ? $path . '/' : ''), '/');

            $durl = $dom->createElement('url');
            $urlset->appendChild($durl);

            $durl->appendChild($dom->createElement('loc', $url));
            $durl->appendChild($dom->createElement('lastmod', date('Y-m-d')));
            $durl->appendChild($dom->createElement('changefreq', 'weekly'));
            $durl->appendChild($dom->createElement('priority', $priority));
        }

        $dest = self::$root . 'sitemap.xml';
        file_put_contents($dest, $dom->saveXML());
        
        $destrobots = self::$root . 'robots.txt';
        $urlrobots = rtrim(self::$config->data->baseurl, '/') . '/sitemap.xml';
        file_put_contents($destrobots, "User-agent: *\nAllow: /\nSitemap: {$urlrobots}");
        
        self::exportFile([$dest, $destrobots]);
        return realpath($dest);
    }


    /**
     * Auto-wires each page: a theme/FOUC guard as the first child of <head>, a
     * <link> for every `sass` task output, a <script> (no `defer`, before
     * </body>) for every `esbuild` task output, and — when `format` is on — a
     * tiny de-indent script that flattens the leading whitespace HTML::format()
     * adds inside `<pre><code>`. Paths use $relroot so they work at any depth.
     *
     * Runs unless `prepros.head` is `false`. A single task opts out with
     * `head: false`. A file already referenced in the page is left alone.
     * The `?###TIMESTAMP###` cache-buster is left literal at render time and
     * only expanded on export (see replaceTokens()), so rebuilding a preview
     * never rewrites the committed page.
     */
    private static function injectHead(string $contents, string $relroot): string
    {
        $inject = [];

        // Theme guard — skip if the page already carries one.
        if (!str_contains($contents, 'kirigami-theme')) {
            $inject[] = '<script>(function(){var e=document.documentElement;'
                . 'e.classList.add("js");try{var t=localStorage.getItem("kirigami-theme");'
                . 'if(t==="dark"||t==="light")e.setAttribute("data-theme",t)}catch(x){}})();</script>';
        }

        $links   = [];
        $scripts = [];

        // Undo the <pre><code> indentation HTML::format() added, at parse time
        // (before first paint), for blocks a build-time highlighter didn't
        // already flatten (those carry child <span>s).
        if (!empty(self::$config->format)) {
            $scripts[] = '<script>document.querySelectorAll("pre>code").forEach(function(c){'
                . 'if(c.children.length)return;'
                . 'var L=c.textContent.replace(/^\n+/,"").replace(/\s+$/,"").split("\n"),n=1/0;'
                . 'L.forEach(function(l){if(l.trim())n=Math.min(n,l.match(/^\s*/)[0].length)});'
                . 'if(n&&n<1/0)c.textContent=L.map(function(l){return l.slice(n)}).join("\n")});</script>';
        }
        foreach ((array) (self::$config->tasks ?? []) as $task) {
            $task = (array) $task;
            if (($task['head'] ?? true) === false) continue;
            $entry = (string) ($task['entry'] ?? '');
            if ($entry === '') continue;

            if (($task['type'] ?? '') === 'sass') {
                $out = preg_replace('/\.s?css$/', '.min.css', $entry);
                if ($out !== $entry && !str_contains($contents, $out)) {
                    $links[] = '<link rel="stylesheet" href="' . $relroot . $out . '?###TIMESTAMP###">';
                }
            } elseif (($task['type'] ?? '') === 'esbuild') {
                $out = preg_replace('/\.[jt]s$/', '.min.js', $entry);
                if ($out !== $entry && !str_contains($contents, $out)) {
                    $scripts[] = '<script src="' . $relroot . $out . '?###TIMESTAMP###"></script>';
                }
            }
        }

        $head = implode("\n    ", array_merge($inject, $links));
        if ($head !== '') {
            // Slot it right after <meta charset> when there is one (keep the
            // charset first), otherwise right after <head>.
            if (preg_match('/<meta\s+charset=[^>]*>/i', $contents)) {
                $contents = preg_replace('/(<meta\s+charset=[^>]*>)/i', "$1\n    " . $head, $contents, 1);
            } elseif (preg_match('/<head\b[^>]*>/i', $contents)) {
                $contents = preg_replace('/(<head\b[^>]*>)/i', "$1\n    " . $head, $contents, 1);
            }
        }
        if ($scripts && preg_match('/<\/body>/i', $contents)) {
            $contents = preg_replace('/(<\/body>)/i', "    " . implode("\n    ", $scripts) . "\n$1", $contents, 1);
        }

        return $contents;
    }


    /**
     * Expands the build-time text tokens in a generated file. Runs at render
     * time (so `kiri build` / `kiri watch` previews show real values, not the
     * literal `###YEAR###`).
     *
     * `###TIMESTAMP###` is deliberately NOT expanded here: it is only ever a
     * cache-buster on the managed-`<head>` asset refs, has no preview value,
     * and expanding it per render would rewrite every committed `src/**` page
     * with a fresh number on each build. The export copy (bin/tasks/dist.js)
     * substitutes it — and `###YEAR###` / `###TODAY###` — when writing `dist/`.
     */
    private static function replaceTokens(string $contents): string
    {
        return strtr($contents, [
            '###YEAR###'  => date('Y'),
            '###TODAY###' => date('Y-m-d'),
        ]);
    }


    public static function exportFile(string|array $file): void
    {
        if(is_string($file)) $file = [$file];
        foreach($file as $value) {
            if (!$path = realpath($value)) continue;
            self::$files[] = $path;
        }
    }


    public static function getExportedFiles(): array
    {
        // array_unique() keeps the original keys, so any duplicate leaves a gap
        // in the sequence — json_encode() would then emit a JSON object instead
        // of an array and the JS side chokes ("retobj.files.map is not a
        // function"). array_values() reindexes so it always serialises as a list.
        $files = array_values(array_unique(self::$files));
        // sort($files);
        return $files;
    }


    private static function callJS(string $cmd, array $params=[]): object
    {
        $args = ['command' => $cmd] + $params;
        /** @disregard [1010] Optional explanation */
        $results = json_decode(post_message_to_js(json_encode($args)));
        return $results;
    }


    public static function mount(string|array $patterns)
    {
        $results = self::callJS('mount', ['patterns' => $patterns]);
        if (!$results->success) return false;
        return $results->results;
    }


    public static function fstat(string $path)
    {
        if (!$results = self::callJS('fstat', ['path' => $path])) return false;
        if (!$results->success) return false;
        if (!$results->results->exists) return false;
        return $results->results;
    }


    public static function backtraceFile()
    {
        $debug = debug_backtrace();
        if(!isset($debug[1])) return false;
        else return $debug[1]['file'];
    }


    public static function registerHook(string $hook, callable $clb)
    {
        self::$hooks[$hook][] = $clb;
    }


    public static function runHook(string $hook, $data = null)
    {
        return self::processHook($hook, $data);
    }


    private static function processHook(string $hook, $data = null)
    {
        if (!empty(self::$hooks[$hook])) {
            foreach (self::$hooks[$hook] as $clb) {
                $data = call_user_func($clb, $data);
            }
        }
        return $data;
    }


    public static function registerTag(string $tag, callable $clb)
    {
        self::$tags[$tag] = $clb;
    }


    private static function processTags(string $contents)
    {
        foreach (self::$tags as $tag => $clb) {
            $contents = STR::replaceTags($tag, $contents, $clb);
        }
        return $contents;
    }

}


include_once(__DIR__ . '/prepros.plugins.php');