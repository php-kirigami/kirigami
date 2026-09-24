import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

// SCHEMA wraps the native jsonk extension; these cases cover the adaptations
// it makes for PHP-array schemas written for the previous pure-PHP validator.
const SCRIPT = String.raw`<?php
$person = [
    'type' => 'object',
    'required' => ['name'],
    'properties' => [
        'name' => ['type' => 'string', 'minLength' => 1],
        'tags' => ['type' => 'array', 'items' => ['type' => 'string']],
    ],
];
$tuple = ['items' => [['type' => 'string'], ['type' => 'integer']], 'additionalItems' => false];
$check = function (array $schema, mixed $data): array {
    $v = new SCHEMA($schema);
    return [$v->isValid($data), $v->getErrors()];
};
$errors = null;
echo json_encode([
    'valid'        => $check($person, ['name' => 'Ada', 'tags' => ['a']]),
    'stdClass'     => $check($person, json_decode('{"name":"Ada"}')),
    'invalid'      => $check($person, ['tags' => ['a', 2]]),
    'emptyProps'   => $check(['type' => 'object', 'properties' => []], ['a' => 1]),
    'emptySchema'  => $check(['additionalProperties' => []], ['a' => 1]),
    'tupleOk'      => $check($tuple, ['a', 1]),
    'tupleExtra'   => $check($tuple, ['a', 1, 2]),
    'url'          => $check(['format' => 'url'], 'not a url'),
    'badRef'       => $check(['$ref' => '#/definitions/missing'], 1),
    // Object enum/const compare by value, whatever the key order.
    'enumObj'      => $check(['enum' => [['a' => 1, 'b' => 2], 'x']], ['b' => 2, 'a' => 1]),
    'enumObjMiss'  => $check(['enum' => [['a' => 1]]], ['a' => 2]),
    'constObj'     => $check(['const' => ['a' => [1, 2]]], json_decode('{"a":[1,2]}')),
    'constObjMiss' => $check(['const' => ['a' => 1]], ['a' => 1, 'b' => 2]),
    'alias'        => [schema_validate(['type' => 'integer'], 'x', $errors), $errors],
    'legacy'       => (new SCHEMA_LEGACY(['type' => 'integer']))->isValid(3),
    'normalizer'   => (new ReflectionClass('Normalizer'))->isInternal(),
    'normLegacy'   => NORMALIZER_LEGACY::normalize("e\u{0301}") === "\u{00E9}",
]);`;

test('SCHEMA validates through jsonk and keeps the previous API', async t => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-schema-'));
    const previous = process.cwd();
    fs.writeFileSync(path.join(project, 'kirigami.yaml'), JSON.stringify({
        kirigami: { root: '_src', project: 'Schema', baseurl: 'https://example.com' },
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

    assert.deepEqual(r.valid, [true, []]);
    assert.deepEqual(r.stdClass, [true, []]);
    assert.equal(r.invalid[0], false);
    assert.equal(r.invalid[1].length, 2);
    assert.match(r.invalid[1][0], /^\(root\): .*"name"/);
    assert.match(r.invalid[1][1], /^tags\[1\]: /);
    assert.deepEqual(r.emptyProps, [true, []]);
    assert.deepEqual(r.emptySchema, [true, []]);
    assert.deepEqual(r.tupleOk, [true, []]);
    assert.equal(r.tupleExtra[0], false);
    assert.match(r.tupleExtra[1][0], /^\[2\]: /);
    assert.equal(r.url[0], false);
    assert.equal(r.badRef[0], false);
    assert.match(r.badRef[1][0], /^\(root\): .*#\/definitions\/missing/);
    assert.deepEqual(r.enumObj, [true, []]);
    assert.equal(r.enumObjMiss[0], false);
    assert.deepEqual(r.constObj, [true, []]);
    assert.equal(r.constObjMiss[0], false);
    assert.equal(r.alias[0], false);
    assert.match(r.alias[1][0], /^\(root\): /);
    assert.equal(r.legacy, true);
    assert.equal(r.normalizer, true);
    assert.equal(r.normLegacy, true);
});
