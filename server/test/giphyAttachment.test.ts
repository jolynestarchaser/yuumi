import assert from 'node:assert/strict';
import test from 'node:test';
import { giphyIdFromUrl, normalizeGiphyAttachment } from '../src/services/giphyAttachment.js';

test('GIPHY resolver persists provider identity rather than an asset URL', () => {
  assert.equal(giphyIdFromUrl('https://giphy.com/gifs/cat-abc123'), 'abc123');
  assert.equal(giphyIdFromUrl('https://media.giphy.com/media/abc123/giphy.gif'), 'abc123');
  assert.equal(giphyIdFromUrl('https://example.com/media/abc123/giphy.gif'), null);

  assert.deepEqual(normalizeGiphyAttachment({ kind: 'giphy', gifId: 'abc123' }), {
    kind: 'giphy',
    provider: 'giphy',
    gifId: 'abc123',
    name: 'GIPHY GIF',
  });
});

test('GIPHY resolver rejects malformed IDs', () => {
  assert.throws(
    () => normalizeGiphyAttachment({ kind: 'giphy', gifId: '../private' }),
    /Invalid GIPHY GIF/,
  );
  assert.equal(normalizeGiphyAttachment({ kind: 'image' } as never), null);
});
