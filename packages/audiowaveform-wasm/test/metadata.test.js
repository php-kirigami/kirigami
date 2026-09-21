import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getId3Tags, getId3CoverArt } from '../index.js';

test('untagged input can have a metadata object with all null fields', async () => {
    const bytes = new Uint8Array(128);
    assert.deepEqual(await getId3Tags(bytes), {
        title: null, artist: null, album: null, albumArtist: null,
        year: null, track: null, genre: null,
    });
    assert.equal(await getId3CoverArt(bytes), null);
});
