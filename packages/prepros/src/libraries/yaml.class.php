<?php

/**
 * YAML — Parseur YAML léger, entièrement statique.
 *
 * Utilisation :
 *   $data = YAML::parse($yamlString);          // mappings → stdClass (défaut)
 *   $data = YAML::parse($yamlString, true);    // mappings → array associatif
 *   $data = YAML::parseFile('/chemin/vers/config.yaml');
 *
 * Supporte :
 *  - Scalaires typés (string, int, float, bool, null)
 *  - Guillemets simples et doubles (avec séquences d'échappement)
 *  - Blocs multi-lignes (| littéral et > replié, avec chomping -, +)
 *  - Plain scalars multi-lignes (continuation sans indicateur)
 *  - Mappings et séquences imbriqués
 *  - Collections inline [a, b] et {k: v}
 *  - Commentaires (#)
 *  - Documents multiples séparés par ---
 */
class YAML
{
    private function __construct() {}

    // -------------------------------------------------------------------------
    // Points d'entrée publics
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
            throw new \RuntimeException("Impossible de lire le fichier : $path");
        }
        return self::parse(file_get_contents($path), $assoc);
    }

    // -------------------------------------------------------------------------
    // Parsing récursif
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
                // Valeur sur les lignes suivantes : sous-bloc ou plain scalar multi-ligne
                self::skipEmptyAndComments($lines, $pos);
                if ($pos < count($lines)) {
                    $nextIndent = self::getIndent($lines[$pos]);
                    if ($nextIndent > $indent) {
                        $nextTrimmed = ltrim($lines[$pos]);
                        // Plain scalar si ce n'est ni un mapping ni une séquence
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
                // Scalaire inline, peut être suivi de lignes de continuation
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
                // Mapping inline dans la séquence :
                // On reconstruit un tableau de lignes virtuel en préfixant la première clé
                // avec fakeIndent, puis on délègue entièrement à parseMapping pour bénéficier
                // de toute sa logique (|, >, plain scalars, sous-blocs…).
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
    // Plain scalar multi-ligne
    // -------------------------------------------------------------------------

    /**
     * Collecte un scalaire qui peut continuer sur des lignes plus indentées que $parentIndent.
     * Les lignes de continuation sont jointes par un espace (repli implicite).
     */
    private static function collectPlainScalar(array $lines, int &$pos, int $parentIndent, string $first): string
    {
        $parts = $first !== '' ? [trim($first)] : [];

        while ($pos < count($lines)) {
            $raw     = $lines[$pos];
            $trimmed = trim($raw);

            // Ligne vide : fin du scalaire
            if ($trimmed === '') break;

            $lineIndent = self::getIndent($raw);

            // Retour à l'indentation parente ou moins : fin
            if ($lineIndent <= $parentIndent) break;

            // Commentaire seul sur la ligne : fin
            if (str_starts_with($trimmed, '#')) break;

            // C'est un mapping ou une séquence : fin
            if (self::isMapping($trimmed) || str_starts_with($trimmed, '- ')) break;

            $parts[] = $trimmed;
            $pos++;
        }

        return implode(' ', $parts);
    }

    // -------------------------------------------------------------------------
    // Blocs multi-lignes
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
    // Collections inline  [a, b]  {k: v}
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
    // Scalaires
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
    // Utilitaires
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