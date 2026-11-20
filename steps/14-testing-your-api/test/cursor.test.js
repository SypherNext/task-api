// Unit tests: no server, no database, milliseconds to run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCursor, decodeCursor } from '../src/cursor.js';

test('a cursor decodes to the row it was made from', () => {
  const row = { id: 42, createdAt: '2026-11-03T20:10:09.547Z', title: 'ignored' };
  assert.deepEqual(decodeCursor(encodeCursor(row)), { createdAt: row.createdAt, id: 42 });
});

test('garbage cursors are rejected, not trusted', () => {
  for (const bad of ['not-a-cursor', '', Buffer.from('[1,2]').toString('base64url'), Buffer.from('["2026-11-03",1.5]').toString('base64url')]) {
    assert.equal(decodeCursor(bad), null, `accepted ${JSON.stringify(bad)}`);
  }
});
