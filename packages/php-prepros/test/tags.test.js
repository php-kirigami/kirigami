import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

// A registered tag written inside Markdown code is example text; outside code it runs.
const FENCE = '```';
const SCRIPT = String.raw`<?php
$box = fn($tag, $attrs, $body) => '[' . json_encode($attrs) . '|' . $body . ']';
$img = fn($tag, $attrs, $body) => empty($attrs['asset']) ? $tag : '<img src="' . $attrs['asset'] . '">';
$run = fn(string $tag, string $s, $clb) => STR::replaceTags($tag, $s, $clb);
echo json_encode([
    'span'    => $run('box', "<box>a ` + '`<box>`' + String.raw` b</box>", $box),
    'close'   => $run('box', "<box>use ` + '`</box>`' + String.raw` here</box> after", $box),
    'double'  => $run('img', 'x ` + '``<img asset="a.jpg">``' + String.raw` y <img asset="b.jpg">', $img),
    'fenced'  => $run('img', "<img asset=\"a.jpg\">\n` + FENCE + String.raw`html\n<img asset=\"b.jpg\">\n` + FENCE + String.raw`\n", $img),
    'attr'    => $run('box', '<box title="` + '`x`' + String.raw`">y</box>', $box),
    'lone'    => $run('img', "it` + '`' + String.raw`s <img asset=\"a.jpg\">", $img),
    'control' => $run('img', "\x1A0\x1A <img asset=\"a.jpg\">", $img),
]);`;

test('STR::replaceTags leaves tags inside Markdown code alone', async t => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-tags-'));
    const previous = process.cwd();
    fs.writeFileSync(path.join(project, 'kirigami.yaml'), JSON.stringify({
        kirigami: { root: '_src', project: 'Tags', baseurl: 'https://example.com' },
        prepros: {},
    }));
    fs.mkdirSync(path.join(project, '_src'));
    fs.writeFileSync(path.join(project, 'check.php'), SCRIPT);
    process.chdir(project);
    const api = await import('../index.js');
    t.after(async () => {
        await api.resetRuntime();
        process.chdir(previous);
        fs.rmSync(project, { recursive: true, force: true });
    });

    const result = await api.runenv('check.php');
    assert.equal(result.success, true, JSON.stringify(result));
    const r = JSON.parse(result.debug);

    assert.equal(r.span, '[[]|a `<box>` b]');
    assert.equal(r.close, '[[]|use `</box>` here] after');
    assert.equal(r.double, 'x ``<img asset="a.jpg">`` y <img src="b.jpg">');
    assert.equal(r.fenced, '<img src="a.jpg">\n' + FENCE + 'html\n<img asset="b.jpg">\n' + FENCE + '\n');
    assert.equal(r.attr, '[{"title":"`x`"}|y]');
    assert.equal(r.lone, 'it`s <img src="a.jpg">');
    assert.equal(r.control, '\x1A0\x1A <img src="a.jpg">');
});
