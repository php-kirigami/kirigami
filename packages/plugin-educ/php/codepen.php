<?php

// ---------------------------------------------------------------------------
// @kirigami/plugin-educ — <codepen> embed.
//
//     <codepen id="BaOaBOJ" tab="css,result" height="360">
//     {% codepen BaOaBOJ anonymous 360 css,result %}
//
// An iframe on the pen's embed page. `id` is the pen's hash (the last part of its
// URL), `user` its owner (default "anonymous": CodePen finds a pen by its id),
// `height` in pixels (default 400) and `tab` the tab shown first (default
// "result"; "css,result" shows the CSS next to the result).
//
// The shortcode keeps the argument order of php-prepros' own {% codepen %}
// (id, user, height) and adds the tab as a fourth one, so it replaces it.
// ---------------------------------------------------------------------------

PREPROS::registerTag('codepen', fn($tag, $attrs, $body) => codepen_render($attrs));

MD::registerPlugin('codepen', function (array $args, string $body): string {
    $id = trim($args[0] ?? '');
    if ($id === '') return '<!-- codepen: missing id -->';
    return codepen_render(['id' => $id, 'user' => $args[1] ?? '', 'height' => $args[2] ?? '', 'tab' => $args[3] ?? '']);
});


function codepen_render(array $attrs): string
{
    $id = trim($attrs['id'] ?? '');
    if (!preg_match('/^[A-Za-z0-9]+$/', $id)) throw new Exception('<codepen> requires an id="…" (the pen hash).');

    $user   = preg_replace('/[^A-Za-z0-9_-]/', '', trim($attrs['user'] ?? '')) ?: 'anonymous';
    $tab    = preg_replace('/[^a-z,]/', '', strtolower(trim($attrs['tab'] ?? ''))) ?: 'result';
    $height = (int) ($attrs['height'] ?? 0) ?: 400;
    $class  = trim($attrs['class'] ?? '');

    return '<iframe class="' . htmlspecialchars('codepen' . ($class !== '' ? ' ' . $class : ''), ENT_QUOTES, 'UTF-8') . '"'
        . ' src="https://codepen.io/' . $user . '/embed/' . $id . '?default-tab=' . $tab . '"'
        . ' height="' . $height . '" loading="lazy" allowfullscreen title="CodePen ' . $id . '"></iframe>';
}
