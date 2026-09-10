<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-highlight — page-level opt-out.
//
// Always included in the prepros runtime by kiri (the `prepros:php` hook).
// A page whose first PHPDOC block carries `@highlight false` (or no / off / 0)
// is left alone by the Node-side `prepros:html` highlighting pass. The signal
// can't cross the PHP→Node boundary as data, so this drops a marker comment
// into the rendered HTML; `src/highlight.js` strips it and skips the page.
// ---------------------------------------------------------------------------

$GLOBALS['__kirigami_highlight_skip'] = false;

PREPROS::registerHook('page_info', function ($data) {
    // page_info passes [$file, $info] or a bare $info (php-prepros 1.4.0+).
    $info = (is_array($data) && array_key_exists(1, $data)) ? $data[1] : $data;
    $val  = is_object($info) ? ($info->highlight ?? null)
          : (is_array($info)  ? ($info['highlight'] ?? null) : null);

    // Skip when @highlight is present and not a truthy value.
    $GLOBALS['__kirigami_highlight_skip'] = $val !== null
        && !in_array(strtolower(trim((string) $val)), ['1', 'true', 'yes', 'on'], true);

    return $data;
});

PREPROS::registerHook('post_render', function ($contents) {
    if (empty($GLOBALS['__kirigami_highlight_skip'])) return $contents;
    $GLOBALS['__kirigami_highlight_skip'] = false;

    $marker = '<!-- kirigami:nohighlight -->';
    if (str_contains($contents, $marker)) return $contents;
    if (preg_match('/<head[^>]*>/i', $contents)) {
        return preg_replace('/(<head[^>]*>)/i', '$1' . $marker, $contents, 1);
    }
    return $marker . "\n" . $contents;
});
