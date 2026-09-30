<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — information bubbles.
//
// Included with educ.php. Five colored boxes with an icon badge:
//
//     <info>Ceci est une bulle d'information</info>
//     <warning>…</warning>     <alert>…</alert>
//     <thumbsup>…</thumbsup>   <bravo>…</bravo>
//
// and, for Markdown pages (where unknown tags are dropped), one shortcode per
// bubble — on one line or as a block, the text is rendered as Markdown:
//
//     {% info Ceci est une bulle d'information %}
//     {% warning
//     Plusieurs lignes, avec du **gras**.
//     %}
//
// The tag form keeps its content as written (HTML allowed). The icon is drawn
// by the stylesheet (assets/_educ.scss), so the markup is one element.
// ---------------------------------------------------------------------------

foreach (['info', 'warning', 'alert', 'thumbsup', 'bravo'] as $bubbleType) {
    PREPROS::registerTag($bubbleType, fn($tag, $attrs, $body) => bubble_render($tag, trim((string) $body), $attrs));

    MD::registerPlugin($bubbleType, function (array $args, string $body) use ($bubbleType): string {
        $text = trim($body !== '' ? $body : implode(' ', $args));
        if ($text === '') return '<!-- ' . $bubbleType . ': empty -->';
        // One paragraph reads better without its <p> wrapper inside the box.
        $html = trim(MD::toHtml($text));
        if (substr_count($html, '<p>') === 1 && str_starts_with($html, '<p>') && str_ends_with($html, '</p>')) {
            $html = substr($html, 3, -4);
        }
        return bubble_render($bubbleType, $html, []);
    });
}


function bubble_render(string $type, string $html, array $attrs): string
{
    $class = 'bubble bubble--' . $type;
    if (($extra = trim($attrs['class'] ?? '')) !== '') $class .= ' ' . htmlspecialchars($extra, ENT_QUOTES, 'UTF-8');
    return '<div class="' . $class . '" role="note">' . $html . '</div>';
}
