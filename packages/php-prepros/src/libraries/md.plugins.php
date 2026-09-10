<?php



// =============================================================================
// DEFAULT PLUGINS (optional, uncomment what you need)
// =============================================================================

// --- CodePen (inline) ---
// {% codepen PENid %}
// {% codepen PENid user height %}
MD::registerPlugin('codepen', function (array $args, string $body): string {
    $id     = htmlspecialchars($args[0] ?? '', ENT_QUOTES, 'UTF-8');
    $user   = htmlspecialchars($args[1] ?? 'anonymous', ENT_QUOTES, 'UTF-8');
    $height = intval($args[2] ?? 400);
    if ($id === '') return '<!-- codepen: missing id -->';
    return "<iframe height=\"{$height}\" style=\"width:100%\" "
         . "scrolling=\"no\" "
         . "src=\"https://codepen.io/{$user}/embed/{$id}?default-tab=result\" "
         . "frameborder=\"no\" loading=\"lazy\" allowfullscreen>"
         . "</iframe>";
});

// --- YouTube (inline) ---
// {% youtube VIDEO_ID %}
// {% youtube VIDEO_ID 560 315 %}
MD::registerPlugin('youtube', function (array $args, string $body): string {
    $id     = htmlspecialchars($args[0] ?? '', ENT_QUOTES, 'UTF-8');
    $width  = intval($args[1] ?? 560);
    $height = intval($args[2] ?? 315);
    if ($id === '') return '<!-- youtube: missing id -->';
    return "<iframe width=\"{$width}\" height=\"{$height}\" "
         . "src=\"https://www.youtube.com/embed/{$id}\" "
         . "title=\"YouTube video player\" frameborder=\"0\" loading=\"lazy\" "
         . "allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture\" "
         . "allowfullscreen></iframe>";
});

// --- Checklist (multi-line block) ---
// {% checklist
// Do the dishes
// Walk the dog
// Read a book
// %}
//
// Optionally with a title:
// {% checklist "My tasks for today"
// Task 1
// Task 2
// %}
MD::registerPlugin('checklist', function (array $args, string $body): string {
    $title = !empty($args[0]) ? '<p class="checklist-title"><strong>' . htmlspecialchars($args[0], ENT_QUOTES, 'UTF-8') . '</strong></p>' : '';
    $items = array_filter(array_map('trim', explode("\n", $body)));
    if (empty($items)) return '<!-- checklist: no items -->';
    $html = "<div class=\"checklist\">{$title}<ul>\n";
    foreach ($items as $item) {
        $html .= '  <li><label><input type="checkbox" /> ' . htmlspecialchars($item, ENT_QUOTES, 'UTF-8') . '</label></li>' . "\n";
    }
    return $html . "</ul></div>";
});

// --- Custom callout (inline or block) ---
// Inline:  {% callout warning "Warning!" Content on one line %}
// Block :  {% callout danger "Title"
//            Paragraph 1
//
//            Paragraph 2
//            %}
MD::registerPlugin('callout', function (array $args, string $body): string {
    $validTypes = ['info', 'success', 'warning', 'danger'];
    $type  = in_array($args[0] ?? '', $validTypes, true) ? $args[0] : 'info';
    $title = !empty($args[1]) ? htmlspecialchars($args[1], ENT_QUOTES, 'UTF-8') : '';

    // Content: $body for a block tag, otherwise the remaining args on the opening line
    if ($body !== '') {
        $content = htmlspecialchars($body, ENT_QUOTES, 'UTF-8');
        // Replace double line breaks with <br><br> to preserve paragraphs
        $content = str_replace("\n\n", '<br><br>', $content);
        $content = str_replace("\n", '<br>', $content);
    } else {
        $content = htmlspecialchars(implode(' ', array_slice($args, $title ? 2 : 1)), ENT_QUOTES, 'UTF-8');
    }

    $titleHtml = $title ? "<strong>{$title}</strong><br>" : '';
    return "<div class=\"callout callout-{$type}\">{$titleHtml}{$content}</div>";
});