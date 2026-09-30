<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-player — {% player %} / {% playlist %} Markdown shortcuts.
//
// Included in the prepros runtime by kiri (the `prepros:php` hook). These
// just emit the plain, non-closing authoring tag:
//
//     {% player ../audio/song.mp3 %}     →   <player src="../audio/song.mp3">
//     {% playlist ../audio/set.m3u %}    →   <playlist src="../audio/set.m3u">
//
// Reading the audio, baking the waveform and building the markup happen in
// the `prepros:html` pass (see src/build.js) — PHP running in WASM can't
// reach the audiowaveform module. A bare <player src="…"> written directly
// in HTML works exactly the same way; these are a Markdown-friendly shorthand.
// ---------------------------------------------------------------------------

MD::registerPlugin('player', function (array $args, string $body): string {
    $src = htmlspecialchars(trim($args[0] ?? ''), ENT_QUOTES, 'UTF-8');
    if ($src === '') return '<!-- player: missing src -->';
    return "<player src=\"{$src}\">";
});

MD::registerPlugin('playlist', function (array $args, string $body): string {
    $src = htmlspecialchars(trim($args[0] ?? ''), ENT_QUOTES, 'UTF-8');
    if ($src === '') return '<!-- playlist: missing src -->';
    return "<playlist src=\"{$src}\">";
});
