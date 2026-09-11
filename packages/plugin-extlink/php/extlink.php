<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-extlink — <extlink> authoring tag.
//
// Included in the prepros runtime by kiri (the `prepros:php` hook). Renders a
// link-preview card for an external URL:
//
//     <extlink src="https://example.com/article">
//
// SCRAPER::get() pulls title / description / image / site name out of the
// target page (OG tags, JSON-LD, oembed, …). Any of the four can be
// overridden on the tag itself — handy when the scrape misses, or gets it
// wrong:
//
//     <extlink src="https://example.com/article" title="A better title">
//
// Both the scrape result and the preview image are cached to disk, keyed by
// STR::shorthash($src), and meant to be committed:
//
//   - _data/extlink/<hash>.json                — the raw SCRAPER::get() result
//   - assets/extlink/<hash>.jpg                 — the downloaded image, as-is
//                                                 (native resolution, re-encoded
//                                                 to jpg) — an archival copy
//   - assets/images/extlink/<hash>.<format>    — the same image, square-
//                                                 cropped, re-encoded to the
//                                                 project's image.format
//
// so a rebuild (including CI, from a fresh checkout) never re-crawls a URL it
// has already resolved once. `image.format`/`image.dest` come from the
// project's own `image:` config — no new config block.
// ---------------------------------------------------------------------------

PREPROS::registerTag('extlink', function ($tag, $attrs, $body) {
    $src = trim($attrs['src'] ?? '');
    if (!$src || !STR::is_url($src)) {
        throw new Exception('<extlink> requires a valid src="https://…" attribute.');
    }

    $key = STR::shorthash($src);
    $dataFile = '_data/extlink/' . $key . '.json';

    // ── Metadata: read the committed cache, or scrape once ──────────────
    if (PREPROS::fstat($dataFile)) {
        PREPROS::mount($dataFile);
        $metas = json_decode(file_get_contents('/project/' . $dataFile)) ?: null;
    }
    if (empty($metas)) {
        try {
            $metas = SCRAPER::get($src) ?: null;
        } catch (Throwable $e) {
            $metas = null;
        }
        $metas = $metas ?: (object) ['url' => $src, 'title' => '', 'description' => '', 'image' => '', 'label' => ''];

        $dir = '/project/_data/extlink';
        if (!is_dir($dir) && !@mkdir($dir, 0777, true)) throw new Exception('<extlink> could not create _data/extlink/.');
        file_put_contents('/project/' . $dataFile, json_encode($metas, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        PREPROS::exportFile('/project/' . $dataFile);
    }

    $title       = trim($attrs['title'] ?? '') ?: trim($metas->title ?? '');
    $description = trim($attrs['description'] ?? '') ?: trim($metas->description ?? '');
    $label       = trim($attrs['label'] ?? '') ?: trim($metas->label ?? '');
    $imageUrl    = trim($attrs['image'] ?? '') ?: trim($metas->image ?? '');

    if (!$title) {
        throw new Exception("<extlink src=\"{$src}\"> found no title on the target page — pass one explicitly: <extlink src=\"{$src}\" title=\"…\">.");
    }

    if (!$label) {
        $label = preg_replace('#^www\.#i', '', (string) parse_url($src, PHP_URL_HOST));
    }

    if ($description !== '' && mb_strlen($description) > 160) {
        $description = rtrim(mb_substr($description, 0, 159)) . '…';
    }

    // ── Image: reuse the local copy, or download + square-crop it once ──
    $image = '';
    if ($imageUrl) {
        $format = PREPROS::$config->image->format ?? 'webp';
        $size = 200; // px, square source crop — matches the card's default display size
        $localName = 'extlink/' . $key . '.' . $format;
        $sourceRel   = FS::pathJoin(PREPROS::$config->image->source, $localName);
        $destRel     = FS::pathJoin(PREPROS::$config->data->root, PREPROS::$config->image->dest, $localName);
        $destVirtual = FS::pathJoin('/project', $destRel);

        $ready = (bool) PREPROS::fstat($destRel);

        if (!$ready) {
            $tmp = '/tmp/extlink-' . $key;
            try {
                if (CURL::getContents($imageUrl, $tmp) !== false && is_file($tmp) && filesize($tmp) > 0) {
                    $img = new IMG($tmp);

                    // The untouched original, at its native resolution — an
                    // archival copy, in case a bigger/differently-cropped
                    // version is ever needed without re-downloading.
                    $originalRel = 'assets/extlink/' . $key . '.jpg';
                    $img->save('/project/' . $originalRel);
                    PREPROS::exportFile('/project/' . $originalRel);

                    $img->resize($size, $size, true);
                    $img->save('/project/' . $sourceRel);
                    PREPROS::exportFile('/project/' . $sourceRel);
                    $img->save($destVirtual);
                    PREPROS::exportFile($destVirtual);
                    $ready = true;
                }
            } catch (Throwable $e) {
                $ready = false; // unreachable / unsupported remote image — card still renders without one
            } finally {
                if (is_file($tmp)) @unlink($tmp);
            }
        }

        if ($ready) $image = FS::getRelativePath(PREPROS::$file, $destVirtual);
    }

    return extlink_render($src, $title, $description, $label, $image);
});


function extlink_render(string $src, string $title, string $description, string $label, string $image): string
{
    $esc = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

    $html = '<a class="extlink" href="' . $esc($src) . '" target="_blank" rel="noopener noreferrer">';
    if ($image) {
        $html .= '<img class="extlink__image" src="' . $esc($image) . '" alt="" loading="lazy">';
    }
    $html .= '<span class="extlink__body">';
    $html .= '<strong class="extlink__title">' . $esc($title) . '</strong>';
    if ($description) $html .= '<span class="extlink__desc">' . $esc($description) . '</span>';
    if ($label) $html .= '<span class="extlink__site">' . $esc($label) . '</span>';
    $html .= '</span></a>';

    return $html;
}
