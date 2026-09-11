<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-embed — {% youtube %} / {% vimeo %} Markdown shortcuts.
//
// Included in the prepros runtime by kiri (the `prepros:php` hook). These
// just emit the plain, non-closing authoring tag:
//
//     {% youtube dQw4w9WgXcQ %}   →   <youtube id="dQw4w9WgXcQ">
//     {% vimeo 1084537 %}        →   <vimeo id="1084537">
//
// The oEmbed fetch and the cover/play-button treatment happen client-side —
// see src/embed.js. A bare <youtube id="…"> / <vimeo id="…"> written
// directly in HTML works exactly the same way with no PHP involved at all;
// these two plugins are just a Markdown-friendly shorthand for it.
//
// Replaces @kirigami/php-prepros's old built-in `{% youtube %}` (removed in
// 1.9.0), which rendered a plain iframe with no oEmbed lookup, no cover
// image, and no play button.
// ---------------------------------------------------------------------------

MD::registerPlugin('youtube', function (array $args, string $body): string {
    $id = htmlspecialchars(trim($args[0] ?? ''), ENT_QUOTES, 'UTF-8');
    if ($id === '') return '<!-- youtube: missing id -->';
    return "<youtube id=\"{$id}\">";
});

MD::registerPlugin('vimeo', function (array $args, string $body): string {
    $id = htmlspecialchars(trim($args[0] ?? ''), ENT_QUOTES, 'UTF-8');
    if ($id === '') return '<!-- vimeo: missing id -->';
    return "<vimeo id=\"{$id}\">";
});
