<?php

/**
 * HtmlFormatter — HTML formatter for Kirigami
 * Uses Dom\HTMLDocument (PHP 8.4, Lexbor engine) to parse, then re-serializes
 * with indentation.
 * <script> and <style> blocks are indented at the right level but not reformatted.
 */
class HTML
{
    private const INDENT = 4;

    // HTML5 boolean attributes — written without a value
    private const BOOLEAN_ATTRS = [
        'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked',
        'controls', 'default', 'defer', 'disabled', 'formnovalidate',
        'hidden', 'ismap', 'loop', 'multiple', 'muted', 'nomodule',
        'noopener', 'noreferrer', 'novalidate', 'open', 'playsinline',
        'readonly', 'required', 'reversed', 'selected', 'webkit-playsinline',
    ];

    // Inline elements — their presence in a parent doesn't prevent inline rendering
    private const INLINE = [
        'a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite',
        'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map',
        'mark', 'object', 'output', 'q', 's', 'samp', 'select', 'small',
        'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'u', 'var',
    ];

    private const RAW  = ['script', 'style'];
    // Whitespace-significant elements: their text content is emitted byte for
    // byte, never re-indented or collapsed (a code block must keep its line
    // breaks and leading spaces; a <textarea> its exact value).
    private const VERBATIM = ['pre', 'textarea'];
    private const VOID = [
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'source', 'track', 'wbr',
    ];

    /** Verbatim blocks stashed during a format() run, keyed by placeholder. */
    private static array $verbatim = [];

    public static function format(string $html): string
    {
        $dom = Dom\HTMLDocument::createFromString($html, LIBXML_NOERROR);

        self::$verbatim = [];
        $output = '';
        foreach ($dom->childNodes as $node) {
            $output .= static::renderNode($node, 0);
        }

        // Collapse runs of blank lines — but not inside <pre>/<textarea>, whose
        // content was swapped out for a placeholder above.
        $output = preg_replace('/\n{3,}/', "\n\n", $output);
        if (self::$verbatim) {
            $output = strtr($output, self::$verbatim);
            self::$verbatim = [];
        }

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

        // Whitespace-significant: emit the inner HTML exactly as parsed, so a
        // <pre>/<textarea> keeps its line breaks and indentation. Only the
        // opening tag is padded to the current depth.
        if (in_array($tag, self::VERBATIM, true)) {
            /** @var DOMElement $node */
            $token = "\x01VERB" . count(self::$verbatim) . "\x01";
            self::$verbatim[$token] = $node->innerHTML;
            return "{$pad}<{$tag}{$attrs}>" . $token . "</{$tag}>\n";
        }

        if ($isRaw) {
            /** @var DOMElement $node */
            $inner = trim($node->innerHTML, "\n\r");
            if (trim($inner) === '') {
                return "{$pad}<{$tag}{$attrs}></{$tag}>\n";
            }
            $childPad = str_repeat(' ', ($depth + 1) * self::INDENT);
            $lines    = explode("\n", $inner);

            // Compute the existing minimum indentation level (ignoring blank lines)
            $minIndent = PHP_INT_MAX;
            foreach ($lines as $line) {
                if (trim($line) === '') continue;
                $minIndent = min($minIndent, strlen($line) - strlen(ltrim($line)));
            }
            $minIndent = $minIndent === PHP_INT_MAX ? 0 : $minIndent;

            // Dedent then re-indent at the right level
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

        // If all children are inline AND it looks like a text flow (real text,
        // or a single child element), re-serialize on a single line.
        // Without looksLikeTextFlow, a <section> holding several large <a> side
        // by side (e.g. a logo grid) would also end up crammed onto one line,
        // since <a> is in INLINE — which is not what we want.
        if (static::hasOnlyInlineChildren($node) && static::looksLikeTextFlow($node)) {
            $inner = trim(static::renderInline($node));
            return "{$pad}<{$tag}{$attrs}>{$inner}</{$tag}>\n";
        }

        $inner = '';
        foreach ($children as $child) {
            $inner .= static::renderNode($child, $depth + 1);
        }

        return "{$pad}<{$tag}{$attrs}>\n{$inner}{$pad}</{$tag}>\n";
    }

    // Serializes a node's inline content on a single line, collapsing any run
    // of spaces/tabs/newlines in the source text to a single space (equivalent
    // to HTML's whitespace-collapsing behavior).
    private static function renderInline(Dom\Node $node): string
    {
        $out = '';
        foreach ($node->childNodes as $child) {
            if ($child->nodeType === XML_TEXT_NODE) {
                $text = preg_replace('/\s+/', ' ', $child->nodeValue);
                $out .= htmlspecialchars($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                continue;
            }
            if ($child->nodeType === XML_COMMENT_NODE) {
                $out .= '<!--' . $child->nodeValue . '-->';
                continue;
            }
            if ($child->nodeType !== XML_ELEMENT_NODE) {
                continue;
            }
            $tag   = strtolower($child->nodeName);
            $attrs = static::renderAttrs($child);
            if (in_array($tag, self::VOID, true)) {
                $out .= "<{$tag}{$attrs}>";
            } else {
                $out .= "<{$tag}{$attrs}>" . static::renderInline($child) . "</{$tag}>";
            }
        }
        return $out;
    }

    // Tells "text that contains a bit of inline" (Click <a>here</a>.) apart from
    // a container that just lines up several inline blocks side by side (a grid
    // of <a><img></a>).
    // True if: there is meaningful text among the children, OR a single child element.
    private static function looksLikeTextFlow(Dom\Node $node): bool
    {
        $elementCount = 0;
        foreach ($node->childNodes as $child) {
            if ($child->nodeType === XML_TEXT_NODE && trim($child->nodeValue) !== '') {
                return true;
            }
            if ($child->nodeType === XML_ELEMENT_NODE) {
                $elementCount++;
            }
        }
        return $elementCount <= 1;
    }

    // Checks that every direct descendant is inline (text, inline void, inline elements)
    // The inline elements themselves must not contain block elements
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
            // Recursive: the inline element must not contain block elements
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
        /** @var DOMElement $node */
        if (!$node->hasAttributes()) {
            return $out;
        }
        foreach ($node->attributes as $attr) {
            $name = strtolower(trim((string) $attr->name));
            if (in_array($name, self::BOOLEAN_ATTRS, true)) {
                $out .= ' ' . $name;
            } else {
                $out .= ' ' . $name . '="' . htmlspecialchars((string) $attr->value, ENT_QUOTES | ENT_HTML5, 'UTF-8') . '"';
            }
        }
        return $out;
    }
}