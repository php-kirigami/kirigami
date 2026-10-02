<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <medialink> downloadable media file.
//
// Included with educ.php. A title with a type glyph, a download button and a
// copy-link button, then the file's full URL in a read-only field:
//
//     <medialink src="images/noise.svg">Bruit</medialink>
//     <medialink src="images/slice.webp" addr="false">Tranche de 15deg</medialink>
//     {% medialink images/noise.svg Bruit %}
//     {% medialink images/slice.webp "Tranche de 15deg" false %}
//
// In the shortcode a trailing `false` after the title hides the URL field.
// `src` is written as it will be linked from the published page (relative to
// the page, from the root, or a URL). The title defaults to the file name.
// `addr="false"` hides the URL field; `class` is added to the block.
//
// Without JavaScript the download button is a plain `download` link. With it
// (src/educ.js), the file is fetched into a blob so the browser saves it
// instead of opening it, even for a type it would display (svg, images, mp3);
// the URL field and the copied link are made absolute against the page.
// The type glyph and the button glyphs are CSS masks (`medialink--<type>`).
// ---------------------------------------------------------------------------

PREPROS::registerTag('medialink', fn($tag, $attrs, $body) => medialink_render($attrs, trim((string) $body)));

MD::registerPlugin('medialink', function (array $args, string $body): string {
    $src = trim($args[0] ?? '');
    if ($src === '') return '<!-- medialink: missing src -->';
    $rest = array_slice($args, 1);
    // A trailing `false` after the title is the addr flag: {% medialink x.svg "Title" false %}
    $addr = count($rest) >= 2 && strtolower(end($rest)) === 'false' ? 'false' : '';
    if ($addr !== '') array_pop($rest);
    return medialink_render(['src' => $src, 'addr' => $addr], trim($body !== '' ? $body : implode(' ', $rest)));
});


const MEDIALINK_TYPES = [
    'svg'   => ['svg'],
    'image' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'ico'],
    'audio' => ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'aac'],
    'video' => ['mp4', 'webm', 'ogv', 'mov', 'm4v'],
    'zip'   => ['zip', 'rar', '7z', 'gz', 'tgz'],
    'pdf'   => ['pdf'],
];


function medialink_render(array $attrs, string $title): string
{
    $src = trim($attrs['src'] ?? '');
    if ($src === '') throw new Exception('<medialink> requires a src="…" attribute.');

    $esc  = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $name = rawurldecode(basename((string) (parse_url($src, PHP_URL_PATH) ?: $src)));
    $ext  = strtolower(pathinfo($name, PATHINFO_EXTENSION));

    $type = 'file';
    foreach (MEDIALINK_TYPES as $t => $exts) {
        if (in_array($ext, $exts, true)) { $type = $t; break; }
    }

    $classes = 'medialink medialink--' . $type;
    if (($extra = trim($attrs['class'] ?? '')) !== '') $classes .= ' ' . $extra;
    $addr = strtolower(trim($attrs['addr'] ?? '')) !== 'false';

    $out = '<div class="' . $esc($classes) . '">'
        . '<div class="medialink__head">'
        . '<span class="medialink__title">' . ($title !== '' ? $title : $esc($name)) . '</span>'
        . '<a class="medialink__download" href="' . $esc($src) . '" download="' . $esc($name) . '" title="Download" aria-label="Download"></a>'
        . '<button type="button" class="medialink__copy" title="Copy link" aria-label="Copy link"></button>'
        . '</div>';
    if ($addr) $out .= '<input class="medialink__url" type="text" readonly value="' . $esc($src) . '" aria-label="URL">';
    return $out . '</div>';
}
