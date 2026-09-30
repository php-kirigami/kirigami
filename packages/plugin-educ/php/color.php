<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <color> swatch badge.
//
// Included with educ.php. A pill filled with the color it names; clicking it
// copies the color code to the clipboard (src/educ.js).
//
//     <color>#ff5500</color>
//     {% color #ff5500 %}
//
// Accepts hex colors (#rgb, #rgba, #rrggbb, #rrggbbaa). The label is the code
// lowercased. The text is set to black or white at build time from the
// color's luminance (`color--light` / `color--dark` classes), so the
// contrast needs no script. The color itself travels in a `--color` custom
// property — the one inline style, since the value is data.
// ---------------------------------------------------------------------------

PREPROS::registerTag('color', fn($tag, $attrs, $body) => color_render((string) $body, $attrs));

MD::registerPlugin('color', function (array $args, string $body): string {
    return color_render($body !== '' ? $body : implode(' ', $args), []);
});


function color_render(string $value, array $attrs): string
{
    $value = strtolower(trim($value));
    if (!preg_match('/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/', $value)) {
        throw new Exception("<color> expects a hex color such as #ff5500, got \"{$value}\".");
    }

    $hex = substr($value, 1);
    if (strlen($hex) <= 4) $hex = preg_replace('/./', '$0$0', $hex);
    [$r, $g, $b] = array_map('hexdec', str_split(substr($hex, 0, 6), 2));
    $light = ($r * 0.299 + $g * 0.587 + $b * 0.114) > 186;

    $esc = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $classes = 'color ' . ($light ? 'color--light' : 'color--dark');
    if (($extra = trim($attrs['class'] ?? '')) !== '') $classes .= ' ' . $extra;

    return '<button type="button" class="' . $esc($classes) . '" style="--color:' . $value . '" data-color="' . $value . '">'
        . $value . '</button>';
}
