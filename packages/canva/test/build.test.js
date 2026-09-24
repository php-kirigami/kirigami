import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { buildAll, watchBuild } from '../build.js';

const waitFor = async predicate => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await delay(50);
    }
    assert.fail('Timed out waiting for watch output');
};

test('Canva builds fail visibly and watch removes stale output and recovers', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-canva-'));
    const write = (file, text) => {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text);
    };
    const exists = file => fs.existsSync(path.join(root, file));
    let watcher;
    const originalError = console.error;
    const errors = [];
    t.after(async () => {
        await watcher?.close();
        console.error = originalError;
        assert.equal(path.dirname(root), os.tmpdir());
        fs.rmSync(root, { recursive: true, force: true });
    });
    write('src/scripts/keep.js', 'export const value = 1;');
    write('src/scripts/gone.js', 'export const removed = true;');
    write('src/scripts/gone.d.ts', 'export declare const removed: boolean;');
    write('src/styles/gone.scss', '.gone { color: red; }');
    write('src/styles/keep.scss', '.keep { color: blue; }');
    await buildAll(root);
    assert.ok(exists('dist/scripts/gone.js.map'));
    assert.ok(exists('dist/scripts/gone.d.ts'));
    write('src/scripts/broken.js', 'export const = ;');
    const cli = spawnSync(process.execPath, [fileURLToPath(new URL('../build.js', import.meta.url))], {
        cwd: root, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(cli.status, 1, cli.error?.message || cli.stderr);
    assert.match(cli.stderr, /Canva build failed/);
    fs.unlinkSync(path.join(root, 'src/scripts/broken.js'));
    await buildAll(root);
    console.error = (...args) => errors.push(args.join(' '));
    watcher = watchBuild(root);
    await watcher.ready;
    for (const file of ['src/scripts/gone.js', 'src/scripts/gone.d.ts', 'src/styles/gone.scss']) {
        fs.unlinkSync(path.join(root, file));
    }
    await waitFor(() => !exists('dist/scripts/gone.js') && !exists('dist/scripts/gone.js.map')
        && !exists('dist/scripts/gone.d.ts') && !exists('dist/styles/gone.scss') && exists('dist/styles/keep.scss'));
    write('src/scripts/keep.js', 'invalid javascript !');
    await waitFor(() => errors.some(error => error.includes('Canva build failed')));
    write('src/scripts/keep.js', 'export const recovered = 42;');
    await waitFor(() => exists('dist/scripts/keep.js') && fs.readFileSync(path.join(root, 'dist/scripts/keep.js'), 'utf8').includes('recovered'));
    await watcher.close(); watcher = null;
    // A copy-phase error must propagate too, not just an esbuild error.
    fs.renameSync(path.join(root, 'src/styles'), path.join(root, 'src/styles-away'));
    await assert.rejects(buildAll(root), /ENOENT/);
});
