<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <quote> citation block.
//
// Included with educ.php (after intlink.php, whose thumbnail helper it reuses).
//
//     <quote author="Gandalf" title="Magicien" photo="./images/gandalf.webp">
//         Un magicien n'est jamais en retard…
//     </quote>
//
// In Markdown pages (where unknown tags are dropped) use the shortcode: the
// author, title and photo are the quoted arguments of the first line, the
// quote itself is the block below (rendered as Markdown):
//
//     {% quote "Gandalf" "Magicien" "./images/gandalf.webp"
//     Un magicien n'est jamais en retard…
//     %}
//
// `author`, `title` and `photo` are all optional. `photo` is a path relative
// to the page (`./…`, `../…`), a path from the site root, or a URL; it is
// square-cropped to 112 px and written as a webp (cached, to commit):
//
//   - assets/images/quote/<hash>.webp      (image source)
//   - <image.dest>/quote/<hash>.webp       (published)
// ---------------------------------------------------------------------------

PREPROS::registerTag('quote', fn($tag, $attrs, $body) => quote_render(trim((string) $body), $attrs));

MD::registerPlugin('quote', function (array $args, string $body): string {
    $text = trim($body);
    if ($text === '') return '<!-- quote: empty -->';
    $html = trim(MD::toHtml($text));
    if (substr_count($html, '<p>') === 1 && str_starts_with($html, '<p>') && str_ends_with($html, '</p>')) {
        $html = substr($html, 3, -4);
    }
    return quote_render($html, ['author' => $args[0] ?? '', 'title' => $args[1] ?? '', 'photo' => $args[2] ?? '']);
});


function quote_render(string $html, array $attrs): string
{
    $esc    = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $author = trim($attrs['author'] ?? '');
    $title  = trim($attrs['title'] ?? '');
    $photo  = trim($attrs['photo'] ?? '');
    $class  = trim($attrs['class'] ?? '');

    // A path relative to the page becomes a path from the site root.
    if ($photo !== '' && preg_match('#^\.{1,2}/#', $photo)) {
        $abs  = FS::pathJoin(dirname(PREPROS::$file), $photo);
        $root = FS::pathJoin('/project', PREPROS::$config->data->root) . '/';
        if (str_starts_with($abs, $root)) $photo = substr($abs, strlen($root));
    }
    $image = $photo !== '' ? intlink_thumbnail($photo, 112, 'quote') : '';

    $out = '<figure class="' . $esc('quote' . ($class !== '' ? ' ' . $class : '')) . '"><blockquote>' . $html . '</blockquote>';
    if ($author !== '' || $image !== '') {
        $out .= '<figcaption>';
        if ($author !== '') {
            $out .= '<span class="quote__who"><strong>— ' . $esc($author) . '</strong>'
                . ($title !== '' ? '<small>' . $esc($title) . '</small>' : '') . '</span>';
        }
        if ($image !== '') $out .= '<img class="quote__photo" src="' . $esc($image) . '" alt="" width="112" height="112" loading="lazy">';
        $out .= '</figcaption>';
    }
    return $out . '</figure>';
}
