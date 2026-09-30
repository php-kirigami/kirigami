<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <intlink> internal link card.
//
// Included with educ.php. Like plugin-extlink's <extlink>, but for a page of
// the same site: the card's title, description and image come from the target
// page's own header.
//
//     <intlink href="../html-base/">
//     {% intlink ../html-base/ %}
//
// `href` is relative to the page being rendered (a leading `/` means the site
// root). It must point to a page folder (an `_index.php` / `_index.md`
// inside); a trailing `index.html` is ignored. The build fails when the
// target page does not exist, so a broken link is caught at build time.
//
// Taken from the target page's header:
//
//     @title                            → card title
//     @abstract (or @description)       → card description
//     @label (or @code)                 → small caption under it
//     @image (or @ogimage, @meta_image) → card image: a path relative to the
//                                         site root (like the SEO `@image`)
//                                         or a full URL
//
// With no image on the target page the card uses the site's default OG image
// (`seo.image`, then `seo.logo`, then the `image` / `ogimage` keys of the
// `kirigami:` block). Any of `title`, `description`, `label`, `image` can be
// overridden on the tag itself.
//
// The image is square-cropped to 200 px and written as a webp next to the
// other generated images (cached — meant to be committed):
//
//   - assets/images/intlink/<hash>.webp      (image source)
//   - <image.dest>/intlink/<hash>.webp       (published)
// ---------------------------------------------------------------------------

PREPROS::registerTag('intlink', fn($tag, $attrs, $body) => intlink_render($attrs));

MD::registerPlugin('intlink', function (array $args, string $body): string {
    $href = trim($args[0] ?? '');
    if ($href === '') return '<!-- intlink: missing href -->';
    return intlink_render(['href' => $href]);
});


function intlink_render(array $attrs): string
{
    $href = trim($attrs['href'] ?? '');
    if ($href === '') throw new Exception('<intlink> requires an href="…" attribute.');

    $info = intlink_target($href);
    $esc  = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $pick = fn(string $attr, string ...$tags) => trim($attrs[$attr] ?? '')
        ?: trim((string) (array_values(array_filter(array_map(fn($t) => $info->$t ?? null, $tags)))[0] ?? ''));

    $title       = $pick('title', 'title');
    $description = $pick('description', 'abstract', 'description');
    $label       = $pick('label', 'label', 'code');
    $imageSpec   = $pick('image', 'image', 'ogimage', 'meta_image') ?: intlink_default_image();
    $class       = trim($attrs['class'] ?? '');

    if ($title === '') throw new Exception("<intlink href=\"{$href}\"> found no @title on the target page.");

    if ($description !== '' && mb_strlen($description) > 160) {
        $description = rtrim(mb_substr($description, 0, 159)) . '…';
    }

    $image = $imageSpec !== '' ? intlink_thumbnail($imageSpec) : '';

    $html = '<a class="' . $esc('intlink' . ($class !== '' ? ' ' . $class : '')) . '" href="' . $esc($href) . '">';
    if ($image !== '') $html .= '<img class="intlink__image" src="' . $esc($image) . '" alt="" width="200" height="200" loading="lazy">';
    $html .= '<span class="intlink__body"><strong class="intlink__title">' . $esc($title) . '</strong>';
    if ($description !== '') $html .= '<span class="intlink__desc">' . $esc($description) . '</span>';
    if ($label !== '') $html .= '<span class="intlink__label">' . $esc($label) . '</span>';
    return $html . '</span></a>';
}


/** The parsed header of the page `$href` points to. */
function intlink_target(string $href): object
{
    $href = preg_replace('#(^|/)index\.html?$#i', '$1', parse_url($href, PHP_URL_PATH) ?: '');
    $dir = str_starts_with($href, '/')
        ? FS::pathJoin('/project', PREPROS::$config->data->root, $href)
        : FS::pathJoin(dirname(PREPROS::$file), $href);

    $file = is_dir($dir) ? FS::indexFile($dir) : null;
    $info = $file ? FS::phpFileInfo($file) : false;
    if (!$info) throw new Exception("<intlink href=\"{$href}\"> points to no page: expected a folder with an _index.php or _index.md at {$dir}.");

    return $info;
}


/** The site's default OG image, as the raw configured value ('' when none). */
function intlink_default_image(): string
{
    $seo  = PREPROS::$config->seo ?? null;
    $site = PREPROS::$config->kirigami ?? PREPROS::$config;
    foreach ([$seo->image ?? null, $seo->logo ?? null, $site->image ?? null, $site->ogimage ?? null] as $v) {
        if (is_string($v) && trim($v) !== '') return trim($v);
    }
    return '';
}


/**
 * A square webp ($size px, in `assets/images/$dir/`) of the image `$spec` (a path relative to the site root,
 * or a URL), written once and reused. Returns its URL relative to the page
 * being rendered, or '' when the image cannot be read.
 */
function intlink_thumbnail(string $spec, int $size = 200, string $dir = 'intlink'): string
{
    // A URL on the site's own baseurl is a local file.
    $baseurl = rtrim((string) (PREPROS::$config->kirigami->baseurl ?? PREPROS::$config->baseurl ?? ''), '/');
    if ($baseurl !== '' && str_starts_with($spec, $baseurl . '/')) $spec = substr($spec, strlen($baseurl));

    $remote = (bool) preg_match('#^(https?:)?//#', $spec);
    $key = STR::shorthash($spec . '@' . $size);
    $localName   = $dir . '/' . $key . '.webp';
    $sourceRel   = FS::pathJoin(PREPROS::$config->image->source, $localName);
    $destRel     = FS::pathJoin(PREPROS::$config->data->root, PREPROS::$config->image->dest, $localName);
    $destVirtual = FS::pathJoin('/project', $destRel);

    $srcRel = $remote ? null : FS::pathJoin(PREPROS::$config->data->root, $spec);
    $srcInfo = $srcRel ? PREPROS::fstat($srcRel) : null;
    if (!$remote && !$srcInfo) throw new Exception("<intlink>: image \"{$spec}\" not found in the site root.");

    $destInfo = PREPROS::fstat($destRel);
    $stale = !$destInfo || ($srcInfo && (strtotime($srcInfo->modifiedAt) - strtotime($destInfo->modifiedAt)) > 10);

    if ($stale) {
        $tmp = '/tmp/intlink-' . $key;
        try {
            if ($remote) {
                $url = str_starts_with($spec, '//') ? 'https:' . $spec : $spec;
                if (CURL::getContents($url, $tmp) === false || !is_file($tmp) || filesize($tmp) === 0) return '';
                $local = $tmp;
            } else {
                $local = current(PREPROS::mount($srcRel));
                if (!$local || !is_file($local)) return '';
            }
            $img = new IMG($local);
            $img->resize($size, $size, true);
            $img->save('/project/' . $sourceRel);
            PREPROS::exportFile('/project/' . $sourceRel);
            $img->save($destVirtual);
            PREPROS::exportFile($destVirtual);
        } catch (Throwable $e) {
            return ''; // unreachable / unsupported image: the card renders without one
        } finally {
            if (is_file($tmp)) @unlink($tmp);
        }
    }

    return FS::getRelativePath(PREPROS::$file, $destVirtual);
}
