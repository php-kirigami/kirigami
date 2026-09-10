<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-highlight — <highlight> authoring tag.
//
// Included in the prepros runtime by kiri (the `prepros:php` hook) when the
// plugin's `tag` option is on. It only normalises
//
//     <highlight lang="js"> … source … </highlight>
//
// into the same markup a fenced code block produces:
//
//     <pre><code class="language-js"> … escaped source … </code></pre>
//
// The actual highlighting still happens later, in Node, via the plugin's
// `prepros:html` hook — this file ships no highlighter.
// ---------------------------------------------------------------------------

PREPROS::registerTag('highlight', function ($tag, $attrs, $body) {
    $lang = '';
    foreach (['lang', 'language', 'l'] as $key) {
        if (!empty($attrs[$key]) && is_string($attrs[$key])) {
            $lang = strtolower(trim($attrs[$key]));
            break;
        }
    }

    $code = STR::trimIndent(trim($body, "\r\n"));
    $code = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');

    $class = $lang !== ''
        ? ' class="language-' . htmlspecialchars($lang, ENT_QUOTES, 'UTF-8') . '"'
        : '';

    return "<pre><code{$class}>{$code}</code></pre>";
});
