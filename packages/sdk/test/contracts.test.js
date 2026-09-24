import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { reset, on, run, has, registerCommand, getCommand, listCommands, resetCommands, registerTaskType, getTaskType, listTaskTypes, resetTaskTypes } from '../index.js';

test('hook, command and task-type registries match the declared API', async () => {
    try {
        on('test', () => 1);
        registerCommand('hello', { run: async (args, project) => project.prefix + args[0] });
        assert.equal(await getCommand('hello').run(['world'], { prefix: 'Hello ' }), 'Hello world');
        assert.deepEqual(listCommands().map(({ name, description }) => ({ name, description })), [{ name: 'hello', description: '' }]);
        reset('test'); assert.equal(has('test'), false); assert.ok(getCommand('hello'));
        assert.throws(() => registerCommand('hello', { run() {} }));
        resetCommands('hello'); assert.equal(getCommand('hello'), null);
        assert.throws(() => registerCommand('invalid', { run: null }));
        registerTaskType('fixture', { canbuild: true, run: async (_root, task) => ({ success: task.ok }) });
        assert.deepEqual(await getTaskType('fixture').run('', { ok: true }), { success: true });
        assert.deepEqual(listTaskTypes().map(({ name, taskname, canbuild, canwatch }) => ({ name, taskname, canbuild, canwatch })), [
            { name: 'fixture', taskname: 'fixture', canbuild: true, canwatch: false },
        ]);
        assert.throws(() => registerTaskType('fixture', { run() {} }));
        resetTaskTypes('fixture'); assert.equal(getTaskType('fixture'), null);
        assert.throws(() => registerTaskType('invalid', { run: null }));
        assert.throws(() => registerTaskType('invalid-watch', { canwatch: true, run() {} }));
    } finally { reset(); resetCommands(); resetTaskTypes(); }
});

test('separate copies of the package share one registry', async (t) => {
    // npm installs a second copy when a plugin pins another version.
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-sdk-'));
    t.after(() => fs.rmSync(copy, { recursive: true, force: true }));
    const root = fileURLToPath(new URL('..', import.meta.url));
    for (const entry of ['index.js', 'package.json', 'src']) fs.cpSync(path.join(root, entry), path.join(copy, entry), { recursive: true });
    const other = await import(pathToFileURL(path.join(copy, 'index.js')).href);
    assert.notEqual(other.on, on, 'a separate module instance');
    try {
        other.on('shared', () => 'from the copy');
        other.registerCommand('copied', { run: () => 1 });
        other.registerTaskType('copied', { run: () => 1 });
        assert.deepEqual(await run('shared'), ['from the copy']);
        assert.ok(getCommand('copied'));
        assert.ok(getTaskType('copied'));
        reset(); resetCommands(); resetTaskTypes();
        assert.equal(other.has('shared'), false);
        assert.equal(other.getCommand('copied'), null);
    } finally { reset(); resetCommands(); resetTaskTypes(); }
});
