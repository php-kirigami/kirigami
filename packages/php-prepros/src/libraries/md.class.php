<?php

/**
 * MD — Markdown renderer backed by the native `mdhtml` extension (CommonMark
 * + GFM via cmark-gfm 0.29.0.gfm.13, statically built into @kirigami/php-wasm
 * — see php-kirigami/php-mdhtml).
 *
 * Switched from the hand-written recursive-descent/regex renderer to this
 * native extension — see docs/DECISIONS.md and docs/STATUS.md in the repo
 * root for the full reasoning. Every MD::toHtml() extension (plugins, emoji,
 * GFM alerts, definition lists, heading anchors, ==highlight==/^sup^/~sub~)
 * is reimplemented in C, not just the CommonMark/GFM core — see php-mdhtml's
 * README for exactly what's covered.
 *
 * Kept the old implementation as MD_LEGACY (md-legacy.class.php) — untouched,
 * still autoloadable — as a rollback path.
 *
 * Usage:
 *   $html = MD::toHtml($markdown);
 *   MD::registerPlugin('name', function (array $args, string $body): string { ... });
 *   MD::registerEmoji('kirigami', '📐');
 */
class MD
{
    public static function registerPlugin(string $name, callable $callback): void
    {
        \MDHtml\RegisterPlugin($name, $callback);
    }

    public static function unregisterPlugin(string $name): void
    {
        \MDHtml\UnregisterPlugin($name);
    }

    public static function getRegisteredPlugins(): array
    {
        return \MDHtml\GetRegisteredPlugins();
    }

    public static function registerEmoji(string $shortcode, string $char): void
    {
        \MDHtml\RegisterEmoji($shortcode, $char);
    }

    public static function toHtml(string $markdown): string
    {
        return \MDHtml\Render($markdown);
    }
}


// Default Markdown plugins ({% codepen %}, {% checklist %}, {% callout %},
// {% img-asset %}) — "registered out of the box" per the README. Loaded here
// so every entrypoint (prepros.php, runenv.php, imagebatch.php) gets them
// without an explicit include. A project can still MD::unregisterPlugin() any
// of them, or MD::registerPlugin() its own with the same name to override.
include_once(__DIR__ . '/md.plugins.php');
