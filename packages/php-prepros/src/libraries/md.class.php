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

// Workaround for php-mdhtml 0.1.2: its plugin table outlives the request, but
// MDHtml\RegisterPlugin() stores request-allocated keys and closures in it.
// Once the request ends they dangle, and the next request's registration
// frees them again — a heap corruption that aborts the PHP-WASM runtime a
// few renders later (serve/watch, repeated builds). Every request registers
// its plugins again anyway (this file, plus the project's `includes`), so
// emptying the table while the request's memory is still valid is lossless.
// Registered here, i.e. after utils.inc.php's `shutdown` hook, so Markdown
// rendered from that hook still sees the plugins. MDHtml\RegisterEmoji() has
// the same flaw and no unregister function: only the extension can fix it.
register_shutdown_function(static function (): void {
    foreach (\MDHtml\GetRegisteredPlugins() as $name) \MDHtml\UnregisterPlugin($name);
});
