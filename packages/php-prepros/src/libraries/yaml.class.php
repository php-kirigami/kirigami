<?php

/**
 * YAML — lightweight, fully static YAML parser.
 *
 * Usage:
 *   $data = YAML::parse($yamlString);          // mappings → stdClass (default)
 *   $data = YAML::parse($yamlString, true);    // mappings → associative array
 *   $data = YAML::parseFile('/path/to/config.yaml');
 *
 * Supports:
 *  - Typed scalars (string, int, float, bool, null)
 *  - Single and double quotes (with escape sequences)
 *  - Multi-line blocks (| literal and > folded, with chomping -, +)
 *  - Multi-line plain scalars (continuation with no indicator)
 *  - Nested mappings and sequences
 *  - Inline collections [a, b] and {k: v}
 *  - Comments (#)
 *  - Multiple documents separated by ---
 */
class YAML
{
    private function __construct() {}

    // -------------------------------------------------------------------------
    // Public entry points
    // -------------------------------------------------------------------------

    public static function parse(string $yaml, bool $assoc = false): mixed
    {
        $yaml  = str_replace(["\r\n", "\r"], "\n", $yaml);
        $lines = explode("\n", $yaml);
        $pos   = 0;

        $documents = [];

        while ($pos < count($lines)) {
            $line = $lines[$pos];
            if (preg_match('/^---/', $line)) { $pos++; continue; }
            if (preg_match('/^\.\.\./', $line)) { $pos++; break; }

            $doc = self::parseBlock($lines, $pos, 0, $assoc);
            $documents[] = $doc;
        }

        return count($documents) === 1 ? $documents[0] : $documents;
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
    // Recursive parsing
    // -------------------------------------------------------------------------

    private static function parseBlock(array $lines, int &$pos, int $indent, bool $assoc = false): mixed
    {
        self::skipEmptyAndComments($lines, $pos);

        if ($pos >= count($lines)) return null;

        $line       = $lines[$pos];
        $lineIndent = self::getIndent($line);
        $trimmed    = ltrim($line);

        if (str_starts_with($trimmed, '- ') || $trimmed === '-') {
            return self::parseSequence($lines, $pos, $lineIndent, $assoc);
        }

        if (self::isMapping($trimmed)) {
            return self::parseMapping($lines, $pos, $lineIndent, $assoc);
        }

        return null;
    }

    private static function parseMapping(array $lines, int &$pos, int $indent, bool $assoc = false): array|object
    {
        $result = [];

        while ($pos < count($lines)) {
            self::skipEmptyAndComments($lines, $pos);
            if ($pos >= count($lines)) break;

            $line       = $lines[$pos];
            $lineIndent = self::getIndent($line);
            $trimmed    = ltrim($line);

            if ($lineIndent < $indent) break;
            if ($lineIndent > $indent) break;
            if (preg_match('/^(---|\.\.\.)\s*$/', $trimmed)) break;
            if (!self::isMapping($trimmed)) break;

            [$key, $rest] = self::splitKeyValue($trimmed);
            $pos++;

            if ($rest === null) {
                // Value on the following lines: sub-block or multi-line plain scalar
                self::skipEmptyAndComments($lines, $pos);
                if ($pos < count($lines)) {
                    $nextIndent = self::getIndent($lines[$pos]);
                    if ($nextIndent > $indent) {
                        $nextTrimmed = ltrim($lines[$pos]);
                        // Plain scalar if it's neither a mapping nor a sequence
                        if (!self::isMapping($nextTrimmed) && !str_starts_with($nextTrimmed, '- ')) {
                            $result[$key] = self::parseScalar(
                                self::collectPlainScalar($lines, $pos, $indent, '')
                            );
                        } else {
                            $result[$key] = self::parseBlock($lines, $pos, $nextIndent, $assoc);
                        }
                    } else {
                        $result[$key] = null;
                    }
                } else {
                    $result[$key] = null;
                }
            } elseif ($rest === '|' || $rest === '|-' || $rest === '|+') {
                $result[$key] = self::parseLiteralBlock($lines, $pos, $indent, $rest);
            } elseif ($rest === '>' || $rest === '>-' || $rest === '>+') {
                $result[$key] = self::parseFoldedBlock($lines, $pos, $indent, $rest);
            } elseif ($rest !== '' && ($rest[0] === '[' || $rest[0] === '{')) {
                $result[$key] = self::parseInlineCollection($rest, $assoc);
            } else {
                // Inline scalar, may be followed by continuation lines
                $result[$key] = self::parseScalar(
                    self::collectPlainScalar($lines, $pos, $indent, $rest)
                );
            }
        }

        return $assoc ? $result : (object) $result;
    }

    private static function parseSequence(array $lines, int &$pos, int $indent, bool $assoc = false): array
    {
        $result = [];

        while ($pos < count($lines)) {
            self::skipEmptyAndComments($lines, $pos);
            if ($pos >= count($lines)) break;

            $line       = $lines[$pos];
            $lineIndent = self::getIndent($line);
            $trimmed    = ltrim($line);

            if ($lineIndent < $indent) break;
            if ($lineIndent > $indent) break;
            if (preg_match('/^(---|\.\.\.)\s*$/', $trimmed)) break;
            if (!str_starts_with($trimmed, '- ') && $trimmed !== '-') break;

            $itemContent = $trimmed === '-' ? '' : substr($trimmed, 2);
            $pos++;

            if ($itemContent === '') {
                self::skipEmptyAndComments($lines, $pos);
                if ($pos < count($lines)) {
                    $nextIndent = self::getIndent($lines[$pos]);
                    $result[] = $nextIndent > $indent
                        ? self::parseBlock($lines, $pos, $nextIndent, $assoc)
                        : null;
                } else {
                    $result[] = null;
                }
            } elseif (self::isMapping($itemContent)) {
                // Inline mapping inside the sequence:
                // Rebuild a virtual array of lines by prefixing the first key
                // with fakeIndent, then delegate entirely to parseMapping to get
                // all of its logic (|, >, plain scalars, sub-blocks…).
                $fakeIndent   = $lineIndent + 2;
                $fakePrefix   = str_repeat(' ', $fakeIndent);
                $virtualLines = array_merge(
                    [$fakePrefix . $itemContent],
                    array_slice($lines, $pos)
                );
                $vPos    = 0;
                $itemMap = self::parseMapping($virtualLines, $vPos, $fakeIndent, $assoc);
                $pos    += max(0, $vPos - 1);
                $result[] = $itemMap;
            } elseif ($itemContent[0] === '[' || $itemContent[0] === '{') {
                $result[] = self::parseInlineCollection($itemContent, $assoc);
            } else {
                $result[] = self::parseScalar($itemContent);
            }
        }

        return $result;
    }

    // -------------------------------------------------------------------------
    // Multi-line plain scalar
    // -------------------------------------------------------------------------

    /**
     * Collects a scalar that may continue on lines more indented than $parentIndent.
     * Continuation lines are joined with a space (implicit folding).
     */
    private static function collectPlainScalar(array $lines, int &$pos, int $parentIndent, string $first): string
    {
        $parts = $first !== '' ? [trim($first)] : [];

        while ($pos < count($lines)) {
            $raw     = $lines[$pos];
            $trimmed = trim($raw);

            // Blank line: end of the scalar
            if ($trimmed === '') break;

            $lineIndent = self::getIndent($raw);

            // Back to the parent indentation or less: end
            if ($lineIndent <= $parentIndent) break;

            // Comment alone on the line: end
            if (str_starts_with($trimmed, '#')) break;

            // It's a mapping or a sequence: end
            if (self::isMapping($trimmed) || str_starts_with($trimmed, '- ')) break;

            $parts[] = $trimmed;
            $pos++;
        }

        return implode(' ', $parts);
    }

    // -------------------------------------------------------------------------
    // Multi-line blocks
    // -------------------------------------------------------------------------

    private static function parseLiteralBlock(array $lines, int &$pos, int $parentIndent, string $indicator): string
    {
        $blockLines  = [];
        $blockIndent = null;
        $chomping    = self::getChomping($indicator);

        while ($pos < count($lines)) {
            $raw = $lines[$pos];

            if (trim($raw) === '') {
                $blockLines[] = '';
                $pos++;
                continue;
            }

            $lineIndent = self::getIndent($raw);
            if ($blockIndent === null) {
                if ($lineIndent <= $parentIndent) break;
                $blockIndent = $lineIndent;
            }
            if ($lineIndent < $blockIndent) break;

            $blockLines[] = substr($raw, $blockIndent);
            $pos++;
        }

        return self::applyChomping(implode("\n", $blockLines), $chomping);
    }

    private static function parseFoldedBlock(array $lines, int &$pos, int $parentIndent, string $indicator): string
    {
        $blockLines  = [];
        $blockIndent = null;
        $chomping    = self::getChomping($indicator);

        while ($pos < count($lines)) {
            $raw = $lines[$pos];

            if (trim($raw) === '') {
                $blockLines[] = '';
                $pos++;
                continue;
            }

            $lineIndent = self::getIndent($raw);
            if ($blockIndent === null) {
                if ($lineIndent <= $parentIndent) break;
                $blockIndent = $lineIndent;
            }
            if ($lineIndent < $blockIndent) break;

            $blockLines[] = rtrim(substr($raw, $blockIndent));
            $pos++;
        }

        $folded = '';
        $count  = count($blockLines);
        for ($i = 0; $i < $count; $i++) {
            if ($blockLines[$i] === '') {
                $folded .= "\n";
            } elseif ($i < $count - 1 && $blockLines[$i + 1] !== '') {
                $folded .= $blockLines[$i] . ' ';
            } else {
                $folded .= $blockLines[$i];
            }
        }

        return self::applyChomping(rtrim($folded, ' '), $chomping);
    }

    // -------------------------------------------------------------------------
    // Inline collections  [a, b]  {k: v}
    // -------------------------------------------------------------------------

    private static function parseInlineCollection(string $raw, bool $assoc = false): mixed
    {
        $raw = trim($raw);
        if ($raw[0] === '[') return self::parseInlineSequence($raw, $assoc);
        if ($raw[0] === '{') return self::parseInlineMapping($raw, $assoc);
        return self::parseScalar($raw);
    }

    private static function parseInlineSequence(string $raw, bool $assoc = false): array
    {
        $inner = trim(substr($raw, 1, strrpos($raw, ']') - 1));
        if ($inner === '') return [];

        return array_map(
            fn($item) => self::parseInlineCollection(trim($item), $assoc),
            self::splitInline($inner)
        );
    }

    private static function parseInlineMapping(string $raw, bool $assoc = false): array|object
    {
        $inner = trim(substr($raw, 1, strrpos($raw, '}') - 1));
        if ($inner === '') return $assoc ? [] : new \stdClass();

        $result = [];
        foreach (self::splitInline($inner) as $pair) {
            $colonPos = strpos($pair, ':');
            if ($colonPos === false) continue;
            $k          = trim(substr($pair, 0, $colonPos));
            $v          = trim(substr($pair, $colonPos + 1));
            $result[$k] = self::parseInlineCollection($v, $assoc);
        }
        return $assoc ? $result : (object) $result;
    }

    private static function splitInline(string $str): array
    {
        $parts    = [];
        $depth    = 0;
        $current  = '';
        $inSingle = false;
        $inDouble = false;

        for ($i = 0, $len = strlen($str); $i < $len; $i++) {
            $c = $str[$i];

            if ($c === "'" && !$inDouble) { $inSingle = !$inSingle; $current .= $c; continue; }
            if ($c === '"'  && !$inSingle) { $inDouble = !$inDouble; $current .= $c; continue; }
            if ($inSingle || $inDouble)    { $current .= $c; continue; }

            if ($c === '[' || $c === '{') { $depth++; $current .= $c; continue; }
            if ($c === ']' || $c === '}') { $depth--; $current .= $c; continue; }

            if ($c === ',' && $depth === 0) { $parts[] = $current; $current = ''; continue; }
            $current .= $c;
        }

        if ($current !== '') $parts[] = $current;
        return $parts;
    }

    // -------------------------------------------------------------------------
    // Scalars
    // -------------------------------------------------------------------------

    private static function parseScalar(string $value): mixed
    {
        $value = trim($value);

        if (!preg_match('/^[\'"]/', $value)) {
            $value = rtrim(preg_replace('/(^|\s)#.*$/', '', $value));
        }

        if ($value === '') return null;

        if (str_starts_with($value, '"') && str_ends_with($value, '"') && strlen($value) >= 2) {
            return stripcslashes(substr($value, 1, -1));
        }

        if (str_starts_with($value, "'") && str_ends_with($value, "'") && strlen($value) >= 2) {
            return str_replace("''", "'", substr($value, 1, -1));
        }

        if (in_array(strtolower($value), ['~', 'null'], true))           return null;
        if (in_array(strtolower($value), ['true', 'yes', 'on'], true))   return true;
        if (in_array(strtolower($value), ['false', 'no', 'off'], true))  return false;
        if (preg_match('/^-?\d+$/', $value))                             return (int) $value;
        if (preg_match('/^-?\d+\.\d*([eE][+-]?\d+)?$/', $value))        return (float) $value;
        if (in_array(strtolower($value), ['.inf', '+.inf'], true))       return INF;
        if (strtolower($value) === '-.inf')                              return -INF;
        if (strtolower($value) === '.nan')                               return NAN;

        return $value;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static function getIndent(string $line): int
    {
        return strlen($line) - strlen(ltrim($line));
    }

    private static function isMapping(string $trimmed): bool
    {
        return (bool) preg_match('/^(?:"[^"]*"|\'[^\']*\'|[^:\'"\[\{]+):\s?/', $trimmed);
    }

    private static function splitKeyValue(string $line): array
    {
        if (preg_match('/^("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\']|\'\')*\'|[^:]+?):\s*(.*)$/', $line, $m)) {
            $key = self::parseScalar($m[1]);
            $val = trim($m[2]) !== '' ? trim($m[2]) : null;
            return [$key, $val];
        }
        return [$line, null];
    }

    private static function skipEmptyAndComments(array $lines, int &$pos): void
    {
        while ($pos < count($lines)) {
            $t = trim($lines[$pos]);
            if ($t === '' || str_starts_with($t, '#')) $pos++;
            else break;
        }
    }

    private static function getChomping(string $indicator): string
    {
        if (str_ends_with($indicator, '-')) return 'strip';
        if (str_ends_with($indicator, '+')) return 'keep';
        return 'clip';
    }

    private static function applyChomping(string $text, string $chomping): string
    {
        return match ($chomping) {
            'strip' => rtrim($text, "\n"),
            'keep'  => $text,
            default => rtrim($text, "\n") . "\n",
        };
    }
}