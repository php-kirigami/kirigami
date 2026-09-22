import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reset, on, has, registerCommand, getCommand, listCommands, resetCommands, registerTaskType, getTaskType, listTaskTypes, resetTaskTypes } from '../index.js';

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
