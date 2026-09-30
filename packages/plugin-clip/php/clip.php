<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-clip — {% clip %} Markdown shortcut.
//
// Included in the prepros runtime by kiri (the `prepros:php` hook). It just
// emits the plain, non-closing authoring tag:
//
//     {% clip ../video/movie.mp4 %}   →   <clip src="../video/movie.mp4">
//
// Picking the poster and building the card happen in the `prepros:html` pass
// (see src/build.js) — PHP running in WASM can't reach @kirigami/bestframe.
// A bare <clip src="…"> written directly in HTML works exactly the same way;
// this is a Markdown-friendly shorthand.
// ---------------------------------------------------------------------------

MD::registerPlugin('clip', function (array $args, string $body): string {
    $src = htmlspecialchars(trim($args[0] ?? ''), ENT_QUOTES, 'UTF-8');
    if ($src === '') return '<!-- clip: missing src -->';
    return "<clip src=\"{$src}\">";
});

// {% inline-clip ../video/loop.mp4 %}  ->  <inline-clip src="../video/loop.mp4">
// A silent, looping, autoplaying video for decoration (see src/build.js).
MD::registerPlugin('inline-clip', function (array $args, string $body): string {
    $src = htmlspecialchars(trim($args[0] ?? ''), ENT_QUOTES, 'UTF-8');
    if ($src === '') return '<!-- inline-clip: missing src -->';
    return "<inline-clip src=\"{$src}\">";
});
