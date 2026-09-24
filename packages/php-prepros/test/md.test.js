import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

// A `{% plugin %}` tag inside code is shown as written; outside code it runs.
const SCRIPT = String.raw`<?php
MD::registerPlugin('tag', fn(array $args, string $body): string => '<b>' . implode('|', $args) . '</b>');
MD::registerPlugin('lead', fn(array $args, string $body): string => '<p class="lead">' . $body . '</p>');
echo json_encode([
    'inline'   => MD::toHtml('Use ` + '`{% tag x %}`' + String.raw` here.'),
    'double'   => MD::toHtml('Use ` + '``{% tag "a b" %}``' + String.raw` here.'),
    'indented' => MD::toHtml("Text\n\n    {% tag x %}\n"),
    'fenced'   => MD::toHtml("` + '```' + String.raw`\n{% tag x %}\n` + '```' + String.raw`\n"),
    'escaped'  => MD::toHtml('` + '`{% tag <x> & %}`' + String.raw`'),
    'live'     => MD::toHtml('` + '`{% tag c %}`' + String.raw` and {% tag live %}'),
    'block'    => MD::toHtml("{% lead\nHello\n%}\n"),
]);`;

test('MD shows plugin tags inside code verbatim and runs them elsewhere', async t => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-md-'));
    const previous = process.cwd();
    fs.writeFileSync(path.join(project, 'kirigami.yaml'), JSON.stringify({
        kirigami: { root: '_src', project: 'MD', baseurl: 'https://example.com' },
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
    const r = Object.fromEntries(Object.entries(JSON.parse(result.debug)).map(([k, v]) => [k, v.trim()]));

    assert.equal(r.inline, '<p>Use <code>{% tag x %}</code> here.</p>');
    assert.equal(r.double, '<p>Use <code>{% tag &quot;a b&quot; %}</code> here.</p>');
    assert.equal(r.indented, '<p>Text</p>\n<pre><code>{% tag x %}\n</code></pre>');
    assert.equal(r.fenced, '<pre><code>{% tag x %}\n</code></pre>');
    assert.equal(r.escaped, '<p><code>{% tag &lt;x&gt; &amp; %}</code></p>');
    assert.equal(r.live, '<p><code>{% tag c %}</code> and <b>live</b></p>');
    assert.equal(r.block, '<p class="lead">Hello</p>');
});
