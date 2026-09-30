<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <doclink> badge link.
//
// Included from educ.php. A pill-shaped link that shows the favicon of the
// site it points to:
//
//     <doclink href="https://developer.mozilla.org/fr/docs/Web/CSS">Le CSS</doclink>
//     {% doclink https://developer.mozilla.org/fr/docs/Web/CSS Le CSS %}
//
// At build time the favicon of the link's host is looked up once — the icons
// the page declares (`<link rel="icon">`, `apple-touch-icon`), then
// `/favicon.ico`, then Google's favicon service — and re-encoded to a 64 px
// square webp. One icon per host, shared by every link to that host, cached
// to disk and meant to be committed:
//
//   - _data/doclink/<host>.json               — lookup result (icon found or not)
//   - assets/images/doclink/<host>.webp        — the icon (image source)
//   - <image.dest>/doclink/<host>.webp        — the same icon, published
//
// A host whose icon could not be found is remembered as such (delete its
// .json file to try again) and gets the generic icon drawn by the stylesheet.
// A local `.zip` link gets a zip icon, any other non-http link a file icon —
// both are CSS-only (`doclink--zip`, `doclink--file`).
// ---------------------------------------------------------------------------

PREPROS::registerTag('doclink', fn($tag, $attrs, $body) => doclink_render($attrs, (string) $body));

MD::registerPlugin('doclink', function (array $args, string $body): string {
    $href = trim($args[0] ?? '');
    if ($href === '') return '<!-- doclink: missing href -->';
    $title = trim($body !== '' ? $body : implode(' ', array_slice($args, 1)));
    return doclink_render(['href' => $href], $title);
});


function doclink_render(array $attrs, string $title): string
{
    $href = trim($attrs['href'] ?? '');
    if ($href === '') throw new Exception('<doclink> requires an href="…" attribute.');

    $esc = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $title = trim($title) !== '' ? trim($title) : $href;

    $classes = ['doclink'];
    $icon = '';

    if (STR::is_url($href)) {
        $host = strtolower((string) parse_url($href, PHP_URL_HOST));
        $icon = doclink_icon($host, preg_replace('#^(https?://[^/]+).*$#i', '$1', $href));
        if ($icon === '') $classes[] = 'doclink--link';
    } else {
        $classes[] = strtolower(pathinfo(parse_url($href, PHP_URL_PATH) ?: $href, PATHINFO_EXTENSION)) === 'zip'
            ? 'doclink--zip'
            : 'doclink--file';
    }

    if (($extra = trim($attrs['class'] ?? '')) !== '') $classes[] = $extra;

    $external = STR::is_url($href);
    return '<a class="' . $esc(implode(' ', $classes)) . '" href="' . $esc($href) . '" target="_blank" rel="noopener noreferrer">'
        . ($icon !== '' ? '<img class="doclink__icon" src="' . $esc($icon) . '" alt="" width="64" height="64" loading="lazy">' : '')
        . '<span class="doclink__title">' . $title . '</span></a>';
}


/** The relative URL of the host's cached icon, or '' when it has none. */
function doclink_icon(string $host, string $origin): string
{
    $key = preg_replace('#[^a-z0-9.-]#', '-', preg_replace('#^www\.#', '', $host));
    $dataFile = '_data/doclink/' . $key . '.json';
    $localName = 'doclink/' . $key . '.webp';
    $sourceRel   = FS::pathJoin(PREPROS::$config->image->source, $localName);
    $destRel     = FS::pathJoin(PREPROS::$config->data->root, PREPROS::$config->image->dest, $localName);
    $destVirtual = FS::pathJoin('/project', $destRel);

    // Already resolved once: the lookup result says whether there is an icon.
    if (PREPROS::fstat($dataFile)) {
        PREPROS::mount($dataFile);
        $found = !empty((json_decode(file_get_contents('/project/' . $dataFile)))->icon);
        return $found && PREPROS::fstat($destRel) ? FS::getRelativePath(PREPROS::$file, $destVirtual) : '';
    }

    $found = false;
    $tmp = '/tmp/doclink-' . $key;
    try {
        foreach (doclink_candidates($origin, $host) as $url) {
            try {
                if (CURL::getContents($url, $tmp) === false || !is_file($tmp) || filesize($tmp) === 0) continue;
                $img = new IMG($tmp);
                $img->resize(64, 64, true);
                $img->save('/project/' . $sourceRel);
                PREPROS::exportFile('/project/' . $sourceRel);
                $img->save($destVirtual);
                PREPROS::exportFile($destVirtual);
                $found = true;
                break;
            } catch (Throwable $e) {
                continue; // not an image, unreachable, unsupported format: next candidate
            } finally {
                if (is_file($tmp)) @unlink($tmp);
            }
        }
    } catch (Throwable $e) {
        $found = false;
    }

    $dir = '/project/_data/doclink';
    if (!is_dir($dir) && !@mkdir($dir, 0777, true)) throw new Exception('<doclink> could not create _data/doclink/.');
    file_put_contents('/project/' . $dataFile, json_encode(['host' => $host, 'icon' => $found], JSON_PRETTY_PRINT));
    PREPROS::exportFile('/project/' . $dataFile);

    return $found ? FS::getRelativePath(PREPROS::$file, $destVirtual) : '';
}


/** Icon URLs to try for a host, best first. */
function doclink_candidates(string $origin, string $host): array
{
    $candidates = [];

    // Icons declared by the home page, biggest first.
    try {
        $html = CURL::getContents($origin . '/');
        if (is_string($html) && preg_match_all('#<link\b[^>]*>#i', $html, $tags)) {
            $declared = [];
            foreach ($tags[0] as $tag) {
                if (!preg_match('#\brel\s*=\s*["\']?([^"\'>]*icon[^"\'>]*)#i', $tag)) continue;
                if (!preg_match('#\bhref\s*=\s*["\']([^"\']+)["\']#i', $tag, $h)) continue;
                $href = html_entity_decode($h[1]);
                if (preg_match('#\.svg(\?|$)#i', $href) || stripos($tag, 'image/svg') !== false) continue; // GD/Imagick can't rely on svg
                $size = preg_match('#sizes\s*=\s*["\'](\d+)x#i', $tag, $s) ? (int) $s[1] : 0;
                $declared[doclink_absolute($href, $origin)] = $size;
            }
            arsort($declared);
            array_push($candidates, ...array_keys($declared));
        }
    } catch (Throwable $e) {
        // home page unreachable: fall through to the well-known locations
    }

    $candidates[] = $origin . '/favicon.ico';
    $candidates[] = 'https://www.google.com/s2/favicons?sz=64&domain=' . rawurlencode($host);

    return array_values(array_unique($candidates));
}


function doclink_absolute(string $href, string $origin): string
{
    if (preg_match('#^https?://#i', $href)) return $href;
    if (str_starts_with($href, '//')) return 'https:' . $href;
    if (str_starts_with($href, '/')) return $origin . $href;
    return $origin . '/' . $href;
}
