<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <tool> card for an external tool or website.
//
// Included with educ.php (after intlink.php, whose thumbnail helpers it
// reuses). Like <extlink>, but nothing is scraped: the text and the picture
// are written by hand, which suits a tool the course recommends.
//
//     <tool href="https://responsive-css.spritegen.com/" title="Responsive CSS Sprites"
//           image="tools/spritegen/thumb.jpg">
//         Combine separate key frames into one sprite sheet.
//     </tool>
//
// and, in Markdown, the quoted arguments on the first line (href, title,
// image — the image is optional) with the description as the block below:
//
//     {% tool https://responsive-css.spritegen.com/ "Responsive CSS Sprites" "tools/spritegen/thumb.jpg"
//     Combine separate key frames into one sprite sheet.
//     %}
//
// `label` (default "OUTIL") is the small caption; `class` is added to the card.
// The image is a path relative to the page, from the site root, or a URL; it is
// square-cropped to 200 px as a webp in `assets/images/tool/` (cached, to commit).
// The card opens the tool in a new tab.
// ---------------------------------------------------------------------------

PREPROS::registerTag('tool', fn($tag, $attrs, $body) => tool_render($attrs, trim((string) $body)));

MD::registerPlugin('tool', function (array $args, string $body): string {
    $href = trim($args[0] ?? '');
    if ($href === '') return '<!-- tool: missing href -->';
    return tool_render(['href' => $href, 'title' => $args[1] ?? '', 'image' => $args[2] ?? ''], trim($body));
});


function tool_render(array $attrs, string $description): string
{
    $href  = trim($attrs['href'] ?? '');
    $title = trim($attrs['title'] ?? '');
    if ($href === '' || $title === '') throw new Exception('<tool> requires href="…" and title="…".');

    $esc   = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $label = trim($attrs['label'] ?? '') ?: 'OUTIL';
    $class = trim($attrs['class'] ?? '');
    $spec  = trim($attrs['image'] ?? '');
    $image = $spec !== '' ? intlink_thumbnail(intlink_site_path($spec), 200, 'tool') : '';

    // The description is Markdown-ish text from a shortcode, HTML from a tag; both are kept as written
    // after a one-paragraph Markdown pass for the shortcode form (inline code, emphasis).
    if ($description !== '' && !str_contains($description, '<')) {
        $html = trim(MD::toHtml($description));
        if (substr_count($html, '<p>') === 1 && str_starts_with($html, '<p>') && str_ends_with($html, '</p>')) {
            $description = substr($html, 3, -4);
        }
    }

    $out = '<a class="' . $esc('intlink intlink--tool' . ($class !== '' ? ' ' . $class : '')) . '" href="' . $esc($href) . '" target="_blank" rel="noopener noreferrer">'
        . '<span class="intlink__body"><em class="intlink__label">' . $esc($label) . '</em>'
        . '<strong class="intlink__title">' . $esc($title) . '</strong>';
    if ($description !== '') $out .= '<span class="intlink__desc">' . $description . '</span>';
    $out .= '</span>';
    if ($image !== '') $out .= '<img class="intlink__image" src="' . $esc($image) . '" alt="" width="200" height="200" loading="lazy">';
    return $out . '</a>';
}
