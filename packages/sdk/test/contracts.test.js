import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reset, on, has, registerCommand, getCommand, listCommands, resetCommands } from '../index.js';

test('hook reset and command registry match the declared API', async () => {
    try {
        on('test', () => 1);
        registerCommand('hello', { run: async (args, project) => project.prefix + args[0] });
        assert.equal(await getCommand('hello').run(['world'], { prefix: 'Hello ' }), 'Hello world');
        assert.deepEqual(listCommands().map(({ name, description }) => ({ name, description })), [{ name: 'hello', description: '' }]);
        reset('test'); assert.equal(has('test'), false); assert.ok(getCommand('hello'));
        assert.throws(() => registerCommand('hello', { run() {} }));
        resetCommands('hello'); assert.equal(getCommand('hello'), null);
        assert.throws(() => registerCommand('invalid', { run: null }));
    } finally { reset(); resetCommands(); }
});
