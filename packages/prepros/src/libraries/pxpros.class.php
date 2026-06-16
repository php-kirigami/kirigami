<?php


final class PXPROS
{

    const SEED_FILE = '_pxpros.json';

    private $root;
    private $file;
    private $page;
    private $config;
    private $vars = [];
    private $tags = [];
    private $hooks = [];
    private $plugins = [];


    /**
     * __construct
     *
     * @param  mixed $prjfile Project configuration file (_pxprox.json)
     * @return void
     */
    public function __construct($prjfile)
    {
        if(!is_file($prjfile)) return false; //throw error
        if(!$json = file_get_contents($prjfile)) return false; //throw error
        if(!$this->config = json_decode($json)) return false; //throw error
        $this->root = pathinfo($prjfile, PATHINFO_DIRNAME) . S;
        // $GLOBALS['PAGE'] = $this;
        $this->includes();
    }


    /**
     * Project and page data getter
     *
     * @param  mixed $name Variable name
     * @return void
     */
    public function __get($name)
    {
        switch ($name) {
            case 'root':
                return $this->root;
            case 'plugins':
                return $this->plugins;
            case 'file':
                return $this->file;
            default:
                if (!empty($this->vars[$name])) return $this->vars[$name];
                elseif (!empty($this->page->{$name})) return $this->page->{$name};
                elseif (!empty($this->config->{$name})) return $this->config->{$name};
                elseif (!empty($this->config->data->{$name})) return $this->config->data->{$name};
        }
    }


    /**
     * Project and page data setter
     *
     * @param  mixed $name
     * @param  mixed $val
     * @return void
     */
    public function __set($name, $val)
    {
        $this->vars[$name] = $val;
    }


    /**
     * Includes base .php files
     *
     * @return void
     */
    private function includes()
    {
        if (!empty($this->config->includes)) foreach ($this->config->includes as $path) {
            if (!is_file(realpath($this->root . $path))) continue;
            else include_once(realpath($this->root . $path));
        }
    }


    /**
     * Render a page
     *
     * @param  mixed $file File to render
     * @return array
     */
    public function render($file)
    {
        $dir = pathinfo($file, PATHINFO_DIRNAME) . S;
        $target = $dir . ltrim(pathinfo($file, PATHINFO_FILENAME), '_') . '.html';

        $this->page = FS::phpFileInfo($file);
        $this->file = realpath($file);
        $this->absurl = str_replace('//', '/', str_replace('\\', '/', pathinfo(str_replace(realpath($this->root), '', $this->file), PATHINFO_DIRNAME)) . '/');
        $this->relroot = FS::getRelativePath($dir, $this->root);
        $this->plugins = [];

        $this->processHook('pre_render', file_get_contents($file));
        
        ob_start();
        if ($this->before) include(realpath($this->root . $this->before));
        $header = ob_get_clean();
        
        ob_start();
        include($file);
        $body = ob_get_clean();
        if($this->indent) {
            $body = join(PHP_EOL, array_map(function($line) {
                return str_repeat(' ', $this->indent) . $line;
            }, explode(PHP_EOL, $body)));
        }
        
        ob_start();
        if ($this->after) include(realpath($this->root . $this->after));
        $footer = ob_get_clean();
        
        $contents = $header . $body . $footer;
        $contents = $this->processTags($contents);
        $contents = $this->processHook('post_render', $contents);
        file_put_contents($target, $contents);
        return realpath($target);
    }



    /**
     * registerTag
     *
     * @param  mixed $tag
     * @param  mixed $clb
     * @return void
     */
    public function registerTag($tag, $clb)
    {
        $this->tags[$tag] = $clb;
    }


    /**
     * processTags
     *
     * @return void
     */
    public function processTags($contents)
    {
        foreach ($this->tags as $tag => $clb) {
            $contents = STR::replaceTags($tag, $contents, $clb);
        }
        return $contents;
    }


    /**
     * registerHook
     *
     * @param  string $hook Name of the hook
     * @param  callable $clb The callback
     * @return void
     */
    public function registerHook($hook, $clb)
    {
        $this->hooks[$hook][] = $clb;
    }


    /**
     * processHook
     *
     * @param  string $hook Name of the hook
     * @param  mixed $data The data to be returned by the callback
     * @return mixed
     */
    public function processHook($hook, $data = null)
    {
        if (!empty($this->hooks[$hook])) {
            foreach ($this->hooks[$hook] as $clb) {
                $data = call_user_func($clb, $data);
            }
        }
        return $data;
    }


    /**
     * Method sitemap
     *
     * @return array
     */
    public function sitemap()
    {
        $paths = [];
        $root = realpath($this->root);
        foreach (FS::dig($root . '/_index.php') as $file) {
            $parent = pathinfo(pathinfo($file, PATHINFO_DIRNAME), PATHINFO_BASENAME);
            if (strpos($parent, '_') === 0) continue;
            if (strpos(pathinfo($file, PATHINFO_FILENAME), '_') !== 0) continue;
            $paths[] = str_replace('\\', '/', ltrim(str_replace($root, '', pathinfo(realpath($file), PATHINFO_DIRNAME)), DIRECTORY_SEPARATOR));
        }
        if(empty($paths)) $paths[] = '';

        $dom = new DOMDocument('1.0', 'UTF-8');
        $dom->formatOutput = true;
        $urlset = $dom->createElementNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'urlset');
        $dom->appendChild($urlset);

        foreach($paths as $path) {
            $deep = $path ? count(explode('/', $path)) : 0;
            $priority = sprintf('%0.1f', (10 - $deep) / 10);
            $url = rtrim($this->baseurl, '/') . '/' . ltrim(($path ? $path . '/' : ''), '/');

            $durl = $dom->createElement('url');
            $urlset->appendChild($durl);

            $durl->appendChild($dom->createElement('loc', $url));
            $durl->appendChild($dom->createElement('lastmod', date('Y-m-d')));
            $durl->appendChild($dom->createElement('changefreq', 'weekly'));
            $durl->appendChild($dom->createElement('priority', $priority));
        }

        $dest = $this->root . 'sitemap.xml';
        file_put_contents($dest, $dom->saveXML());
        return realpath($dest);
    }


    /**
     * Find the currect project configuration file
     *
     * @param  mixed $path Current path
     * @return mixed Returns the project configuration file if exists, otherwise false.
     */
    public static function findSeed($path)
    {
        if (is_file($path)) $path = pathinfo(realpath($path), PATHINFO_DIRNAME);
        elseif (!$path = realpath($path)) return false;
        $recPath = $path;

        do {
            $file = $path . S . self::SEED_FILE;
            if (is_file($file)) return realpath($file);
            $path = pathinfo($path, PATHINFO_DIRNAME);
        } while ($path != pathinfo($path, PATHINFO_DIRNAME));
        
        
        $ignoreDirs = ['.git', 'node_modules', 'vendor'];
        $dir = new RecursiveDirectoryIterator($recPath, FilesystemIterator::SKIP_DOTS);
        $filter = new RecursiveCallbackFilterIterator($dir, function (SplFileInfo $current) use ($ignoreDirs) {
            if ($current->isDir()) {
                return !in_array($current->getFilename(), $ignoreDirs, true);
            }
            return true;
        });
        $it = new RecursiveIteratorIterator($filter, RecursiveIteratorIterator::SELF_FIRST);
        foreach ($it as $file) {
            /** @var SplFileInfo $file */
            if ($file->isFile() && $file->getFilename() === self::SEED_FILE) {
                return $file->getRealPath();
            }
        }
        
        return false;
    }


    public static function findRoot(string $path, bool $abs = false)
    {
        if(!$seed = self::findSeed($path)) return false;
        if(!$root = pathinfo($seed, PATHINFO_DIRNAME)) return false;
        return $abs ?  $root . S : FS::getRelativePath($path, $root);
    }


    public function addPlugin($file) {
        array_push($this->plugins, $file);
    }

}



