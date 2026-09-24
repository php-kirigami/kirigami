<?php

/**
 * YAML — YAML parser backed by PHP's native `yaml` extension (PECL yaml /
 * libyaml), statically built into @kirigami/php-wasm.
 *
 * Usage:
 *   $data = YAML::parse($yamlString);          // mappings → stdClass (default)
 *   $data = YAML::parse($yamlString, true);    // mappings → associative array
 *   $data = YAML::parseFile('/path/to/config.yaml');
 *
 * Follows YAML 1.1 (libyaml's resolver), including its implicit-boolean
 * scalars: not just yes/no/true/false/on/off but also the bare single-letter
 * y/Y/n/N — as a value *or* as a mapping key (the classic "Norway problem":
 * an unquoted `no:` key or a `NO` value resolves to `false`). Quote such
 * scalars (`"y": 2`) in project YAML to keep them as strings. See
 * docs/BUGS.md for the differences found against the previous hand-written
 * parser (now YAML_LEGACY::).
 *
 * `yaml.decode_php` must stay off (it is by default) so a `!php/object` tag
 * in untrusted YAML can't trigger unserialize().
 */
class YAML
{
    private function __construct() {}

    // -------------------------------------------------------------------------
    // Public entry points
    // -------------------------------------------------------------------------

    public static function parse(string $yaml, bool $assoc = false): mixed
    {
        $ndocs = 0;
        $error = null;

        set_error_handler(function (int $errno, string $errstr) use (&$error) {
            $error = $errstr;
            return true;
        });
        $result = yaml_parse($yaml, -1, $ndocs);
        restore_error_handler();

        if ($result === false) {
            throw new \RuntimeException($error ?? 'Failed to parse YAML.');
        }

        if ($ndocs <= 1) {
            return self::convert($result[0] ?? null, $assoc);
        }

        return array_map(fn($doc) => self::convert($doc, $assoc), $result);
    }

    public static function parseFile(string $path, bool $assoc = false): mixed
    {
        if (!is_readable($path)) {
            throw new \RuntimeException("Cannot read file: $path");
        }
        return self::parse(file_get_contents($path), $assoc);
    }

    /**
     * Loads a YAML or JSON file, then walks the result recursively and replaces
     * any string value that matches a relative path to an existing YAML/JSON
     * file with that file's deserialized content.
     *
     * Each included file is itself resolved relative to its own directory, and
     * so on (recursive).
     *
     * If the string doesn't end in .yml/.yaml/.json, or the resolved file
     * doesn't exist, the value is kept as-is.
     *
     * Circular references (e.g. A → B → A) throw a RuntimeException.
     *
     * Usage:
     *   $data = YAML::loadFile('/path/to/config.yaml');
     *   $data = YAML::loadFile('/path/to/config.yaml', true); // assoc arrays
     *
     * @param string   $path   Path to the root file (YAML or JSON).
     * @param bool     $assoc  true → mappings as arrays, false → stdClass.
     * @return mixed
     */
    public static function loadFile(string $path, bool $assoc = false): mixed
    {
        $absolute = realpath($path);
        if ($absolute === false || !is_readable($absolute)) {
            throw new \RuntimeException("Cannot read file: $path");
        }

        return self::loadFileRecursive($absolute, $assoc, []);
    }

    // -------------------------------------------------------------------------
    // Private methods for loadFile
    // -------------------------------------------------------------------------

    /**
     * Loads and resolves a file, propagating the list of ancestors to detect
     * cycles.
     *
     * @param string   $absolute Canonical absolute path of the file to load.
     * @param bool     $assoc
     * @param string[] $ancestors Absolute paths of the files currently being processed.
     * @return mixed
     */
    private static function loadFileRecursive(string $absolute, bool $assoc, array $ancestors): mixed
    {
        if (in_array($absolute, $ancestors, true)) {
            throw new \RuntimeException(
                "Circular reference detected: " . implode(' → ', $ancestors) . " → $absolute"
            );
        }

        $ext  = strtolower(pathinfo($absolute, PATHINFO_EXTENSION));
        $raw  = file_get_contents($absolute);
        $dir  = dirname($absolute);

        if ($ext === 'json') {
            $data = json_decode($raw, $assoc, 512, JSON_THROW_ON_ERROR);
        } else {
            // .yml, .yaml or any other extension treated as YAML
            $data = self::parse($raw, $assoc);
        }

        return self::resolveNode($data, $dir, $assoc, [...$ancestors, $absolute]);
    }

    /**
     * Recursively walks a PHP value (stdClass object, array, string, scalar)
     * and resolves references to external files.
     *
     * @param mixed    $node
     * @param string   $dir      Directory of the file that contains this node.
     * @param bool     $assoc
     * @param string[] $ancestors
     * @return mixed
     */
    private static function resolveNode(mixed $node, string $dir, bool $assoc, array $ancestors): mixed
    {
        if (is_string($node)) {
            return self::resolveString($node, $dir, $assoc, $ancestors);
        }

        if (is_array($node)) {
            foreach ($node as $key => $value) {
                $node[$key] = self::resolveNode($value, $dir, $assoc, $ancestors);
            }
            return $node;
        }

        if ($node instanceof \stdClass) {
            foreach ($node as $key => $value) {
                $node->$key = self::resolveNode($value, $dir, $assoc, $ancestors);
            }
            return $node;
        }

        // int, float, bool, null → returned as-is
        return $node;
    }

    /**
     * If the string points to an existing YAML/JSON file (path relative to the
     * $dir directory), loads that file recursively. Otherwise returns the
     * original string.
     *
     * @param string   $str
     * @param string   $dir
     * @param bool     $assoc
     * @param string[] $ancestors
     * @return mixed
     */
    private static function resolveString(string $str, string $dir, bool $assoc, array $ancestors): mixed
    {
        $trimmed = trim($str);

        // Quick filter on the extension
        if (!preg_match('/\.(ya?ml|json)$/i', $trimmed)) {
            return $str;
        }

        // Resolve the path relative to the parent file's directory
        $candidate = $dir . DIRECTORY_SEPARATOR . $trimmed;
        $absolute  = realpath($candidate);

        if ($absolute === false || !is_readable($absolute)) {
            return $str; // File not found → plain string
        }

        return self::loadFileRecursive($absolute, $assoc, $ancestors);
    }

    // -------------------------------------------------------------------------
    // yaml_parse() → stdClass/array shape
    // -------------------------------------------------------------------------

    /**
     * yaml_parse() always returns plain PHP arrays (associative for mappings,
     * indexed for sequences). $assoc=false wants mappings as stdClass instead
     * — this walks the tree and converts them, leaving sequences as arrays
     * (recursing into their items).
     */
    private static function convert(mixed $node, bool $assoc): mixed
    {
        if ($assoc || !is_array($node)) {
            return $node;
        }

        if (array_is_list($node)) {
            return array_map(fn($v) => self::convert($v, $assoc), $node);
        }

        $obj = new \stdClass();
        foreach ($node as $key => $value) {
            $obj->$key = self::convert($value, $assoc);
        }
        return $obj;
    }
}
