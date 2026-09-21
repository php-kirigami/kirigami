import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('page selection and script containment follow the project contract', async t => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-contract-'));
    const project = path.join(parent, 'project');
    const previous = process.cwd();
    const write = (file, text) => {
        const target = path.join(project, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text);
    };
    write('kirigami.yaml', JSON.stringify({
        kirigami: { root: '_src', project: 'Contracts', baseurl: 'https://example.com' },
        prepros: {},
    }));
    for (const file of ['_index.php', 'public/_index.php', '_private/_index.php',
        '_private/nested/_index.php', 'public/_hidden/deep/_index.php']) {
        write('_src/' + file, '<p>' + file + '</p>');
    }
    write('scripts/check.php', '<?php if ($argv[2] !== "--force" || file_get_contents("/project/extra.txt") !== "ok") throw new Exception("bad input"); echo "passed";');
    write('extra.txt', 'ok');
    fs.writeFileSync(path.join(parent, 'outside.php'), '<?php throw new Exception("must not run");');
    fs.mkdirSync(path.join(parent, 'outside'));
    fs.writeFileSync(path.join(parent, 'outside', 'script.php'), '<?php echo "outside";');
    fs.symlinkSync(path.join(parent, 'outside'), path.join(project, 'linked'), 'junction');
    fs.symlinkSync(path.join(project, 'scripts'), path.join(project, 'alias'), 'junction');
    process.chdir(project);
    const api = await import('../index.js');
    t.after(async () => {
        await api.resetRuntime();
        process.chdir(previous);
        assert.equal(path.dirname(parent), os.tmpdir());
        fs.rmSync(parent, { recursive: true, force: true });
    });
    await t.test('scripts and extra files reject traversal, directories and external links', async () => {
        for (const script of ['../outside.php', path.join(parent, 'outside.php'), '.', 'scripts', 'linked/script.php']) {
            await assert.rejects(api.runenv(script), /outside project|directory/);
        }
        for (const file of ['../outside.php', 'extra/../../outside.php', 'linked/script.php', 'scripts']) {
            await assert.rejects(api.runenv('scripts/check.php', [file], '--force'), /outside project|directory/);
        }
        await assert.rejects(api.runenv('missing.php'), /find PHP file/);
        const result = await api.runenv('scripts/check.php', ['extra.txt', 'missing.txt'], '--force');
        assert.equal(result.success, true, JSON.stringify(result));
        assert.equal(result.debug, 'passed');
        assert.equal((await api.runenv('alias/check.php', ['extra.txt'], '--force')).success, true);
    });
    await t.test('all private ancestors are excluded from rendering and sitemap', async () => {
        const result = await api.render();
        assert.equal(result.success, true, JSON.stringify(result));
        assert.ok(fs.existsSync('_src/index.html'));
        assert.ok(fs.existsSync('_src/public/index.html'));
        for (const file of ['_private/index.html', '_private/nested/index.html', 'public/_hidden/deep/index.html']) {
            assert.equal(fs.existsSync('_src/' + file), false);
        }
        assert.equal((await api.render('_private/nested/_index.php')).success, false);
        assert.equal((await api.render('_private/nested')).success, true);
        assert.equal(fs.existsSync('_src/_private/nested/index.html'), false);
        const sitemap = await api.sitemap();
        assert.equal(sitemap.success, true, JSON.stringify(sitemap));
        const xml = fs.readFileSync('_src/sitemap.xml', 'utf8');
        assert.match(xml, /example.com\/public\//);
        assert.doesNotMatch(xml, /_private|_hidden|nested|deep/);
    });
});
