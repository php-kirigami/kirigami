<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — course-page authoring tags.
//
// Included in the prepros runtime by kiri (the `prepros:php` hook).
//
// <checklist> — one item per line, inline HTML allowed in an item:
//
//     <checklist>
//     Read chapter 1
//     Do the <a href="/exercises">exercises</a>
//     Take the quiz
//     </checklist>
//
//     {% checklist
//     Read chapter 1
//     Take the quiz
//     %}
//
// In Markdown (.md pages, <markdown> blocks) only the shortcut works: cmark
// drops unknown tags.
//
// The list is rendered at build time; src/educ.js only adds the behaviour
// (toggle on click, progress %, state kept in the reader's localStorage).
// `data-id` is a hash of the item lines, so editing the list resets its
// saved state, exactly as the original Vue component did.
// ---------------------------------------------------------------------------

PREPROS::registerTag('checklist', fn($tag, $attrs, $body) => educ_checklist((string) $body));

// The shortcode lives in Markdown, so its items are Markdown too (inline:
// emphasis, `code`, links). The tag form keeps its items as written (HTML).
MD::registerPlugin('checklist', fn(array $args, string $body): string => educ_checklist($body, true));

function educ_checklist(string $body, bool $markdown = false): string
{
    $items = array_values(array_filter(array_map('trim', explode("\n", $body)), fn($l) => $l !== ''));
    if (!$items) return '<!-- checklist: no items -->';

    $id = STR::shorthash(implode("\n", $items));
    $html = '<div class="checklist" data-id="' . $id . '">'
        . '<div class="checklist__percent">0%</div>'
        . '<div class="checklist__bar"></div>'
        . '<ol>';
    foreach ($items as $item) {
        if ($markdown) {
            // One line is one item: drop the <p> wrapper Markdown puts around it.
            $item = trim(MD::toHtml($item));
            if (str_starts_with($item, '<p>') && str_ends_with($item, '</p>') && substr_count($item, '<p>') === 1) {
                $item = substr($item, 3, -4);
            }
        }
        $html .= '<li>' . $item . '</li>';
    }
    return $html . '</ol></div>';
}
