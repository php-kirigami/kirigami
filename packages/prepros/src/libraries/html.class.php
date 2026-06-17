<?php

/**
 * HtmlFormatter — formateur HTML pour Kirigami
 * Utilise Dom\HTMLDocument (PHP 8.4, moteur Lexbor) pour parser,
 * puis re-sérialise avec indentation.
 * Les blocs <script> et <style> sont indentés au bon niveau mais non reformatés.
 */
class HTML
{
    private const INDENT = 4;

    // Attributs booléens HTML5 — écrits sans valeur
    private const BOOLEAN_ATTRS = [
        'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked',
        'controls', 'default', 'defer', 'disabled', 'formnovalidate',
        'hidden', 'ismap', 'loop', 'multiple', 'muted', 'nomodule',
        'noopener', 'noreferrer', 'novalidate', 'open', 'playsinline',
        'readonly', 'required', 'reversed', 'selected', 'webkit-playsinline',
    ];

    // Éléments inline — leur présence dans un parent n'empêche pas le rendu inline
    private const INLINE = [
        'a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite',
        'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map',
        'mark', 'object', 'output', 'q', 's', 'samp', 'select', 'small',
        'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'u', 'var',
    ];

    private const RAW  = ['script', 'style'];
    private const VOID = [
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'source', 'track', 'wbr',
    ];

    public static function format(string $html): string
    {
        $dom = Dom\HTMLDocument::createFromString($html, LIBXML_NOERROR);

        $output = '';
        foreach ($dom->childNodes as $node) {
            $output .= static::renderNode($node, 0);
        }

        $output = preg_replace('/\n{3,}/', "\n\n", $output);

        return rtrim($output) . "\n";
    }

    private static function renderNode(Dom\Node $node, int $depth): string
    {
        return match ($node->nodeType) {
            XML_TEXT_NODE          => static::renderText($node, $depth),
            XML_COMMENT_NODE       => static::renderComment($node, $depth),
            XML_DOCUMENT_TYPE_NODE => static::renderDoctype(),
            default                => static::renderElement($node, $depth),
        };
    }

    private static function renderElement(Dom\Node $node, int $depth): string
    {
        $tag    = strtolower($node->nodeName);
        $pad    = str_repeat(' ', $depth * self::INDENT);
        $attrs  = static::renderAttrs($node);
        $isVoid = in_array($tag, self::VOID, true);
        $isRaw  = in_array($tag, self::RAW,  true);

        if ($isVoid) {
            return "{$pad}<{$tag}{$attrs}>\n";
        }

        if ($isRaw) {
            $inner = trim($node->innerHTML, "\n\r");
            if (trim($inner) === '') {
                return "{$pad}<{$tag}{$attrs}></{$tag}>\n";
            }
            $childPad = str_repeat(' ', ($depth + 1) * self::INDENT);
            $lines    = explode("\n", $inner);

            // Calcule le niveau d'indentation minimal existant (ignore les lignes vides)
            $minIndent = PHP_INT_MAX;
            foreach ($lines as $line) {
                if (trim($line) === '') continue;
                $minIndent = min($minIndent, strlen($line) - strlen(ltrim($line)));
            }
            $minIndent = $minIndent === PHP_INT_MAX ? 0 : $minIndent;

            // Dédente puis ré-indente au bon niveau
            $indented = implode("\n", array_map(
                static fn(string $line) => trim($line) !== ''
                    ? $childPad . substr($line, $minIndent)
                    : '',
                $lines
            ));
            return "{$pad}<{$tag}{$attrs}>\n" . rtrim($indented) . "\n{$pad}</{$tag}>\n";
        }

        $children = iterator_to_array($node->childNodes);

        if (empty($children)) {
            return "{$pad}<{$tag}{$attrs}></{$tag}>\n";
        }

        // Si tous les enfants sont inline, on utilise innerHTML tel quel — pas de reconstruction
        if (static::hasOnlyInlineChildren($node)) {
            $inner = trim($node->innerHTML);
            return "{$pad}<{$tag}{$attrs}>{$inner}</{$tag}>\n";
        }

        $inner = '';
        foreach ($children as $child) {
            $inner .= static::renderNode($child, $depth + 1);
        }

        return "{$pad}<{$tag}{$attrs}>\n{$inner}{$pad}</{$tag}>\n";
    }

    // Vérifie que tous les descendants directs sont inline (texte, void inline, éléments inline)
    // Les éléments inline eux-mêmes ne doivent pas contenir d'éléments block
    private static function hasOnlyInlineChildren(Dom\Node $node): bool
    {
        foreach ($node->childNodes as $child) {
            if ($child->nodeType === XML_TEXT_NODE) {
                continue;
            }
            if ($child->nodeType !== XML_ELEMENT_NODE) {
                return false;
            }
            if (!in_array(strtolower($child->nodeName), self::INLINE, true)) {
                return false;
            }
            // Récursif : l'élément inline ne doit pas contenir d'éléments block
            if (!static::hasOnlyInlineChildren($child)) {
                return false;
            }
        }
        return true;
    }

    private static function renderText(Dom\Node $node, int $depth): string
    {
        $text = trim($node->nodeValue);
        if ($text === '') {
            return '';
        }
        $pad = str_repeat(' ', $depth * self::INDENT);
        return $pad . htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8') . "\n";
    }

    private static function renderComment(Dom\Node $node, int $depth): string
    {
        $pad = str_repeat(' ', $depth * self::INDENT);
        return "{$pad}<!--{$node->nodeValue}-->\n";
    }

    private static function renderDoctype(): string
    {
        return "<!DOCTYPE html>\n";
    }

    private static function renderAttrs(Dom\Node $node): string
    {
        $out = '';
        if (!$node->hasAttributes()) {
            return $out;
        }
        foreach ($node->attributes as $attr) {
            if (in_array($attr->name, self::BOOLEAN_ATTRS, true)) {
                $out .= ' ' . $attr->name;
            } else {
                $out .= ' ' . $attr->name . '="' . htmlspecialchars($attr->value, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"';
            }
        }
        return $out;
    }
}