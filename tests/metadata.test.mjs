import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const metadata = JSON.parse(await readFile(
    new URL('../metadata.json', import.meta.url), 'utf8'));

test('declares every supported GNOME Shell release', () => {
    assert.deepEqual(metadata['shell-version'], [
        '45',
        '46',
        '47',
        '48',
        '49',
        '50',
        '51',
    ]);
});
