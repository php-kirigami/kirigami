<?php


final class PREPROS
{

    public  static mixed  $config;    
    private static string $root;
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
    }


    public static function render(string $file)
    {
        $dir = pathinfo($file, PATHINFO_DIRNAME) . S;
        $target = $dir . ltrim(pathinfo($file, PATHINFO_FILENAME), '_') . '.html';
        $file = realpath($file);
        $absurl = str_replace('//', '/', str_replace('\\', '/', pathinfo(str_replace(realpath(self::$root), '', $file), PATHINFO_DIRNAME)) . '/');
        $relroot = FS::getRelativePath($dir, self::$root);
        $page = self::processHook('page_info', [$file, FS::phpFileInfo($file)]);

        extract((array)self::$config->data);
        extract((array)$page);

        self::processHook('pre_render', file_get_contents($file));

        ob_start();
        if (self::$config->before) include(realpath(self::$root . self::$config->before));
        $header = ob_get_clean();

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
        if (self::$config->after) include(realpath(self::$root . self::$config->after));
        $footer = ob_get_clean();

        $contents = $header . $body . $footer;
        $contents = self::processTags($contents);
        $contents = self::processHook('post_render', $contents);

        if(!empty(self::$config->format)) $contents = HTML::format($contents);

        file_put_contents($target, $contents);
        self::exportFile($target);
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
        self::exportFile($dest);
        return realpath($dest);
    }


    public static function exportFile(string $file): void
    {
        if (!$path = realpath($file)) return;
        self::$files[] = $path;
    }


    public static function getExportedFiles(): array
    {
        $files = array_unique(self::$files);
        sort($files);
        return $files;
    }


    public static function registerHook(string $hook, callable $clb)
    {
        self::$hooks[$hook][] = $clb;
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