import test from 'node:test';
import assert from 'node:assert/strict';
import { giphyIdFromUrl } from './giphy.js';

test('GIPHY share and media URLs yield a stable provider ID', () => {
  assert.equal(giphyIdFromUrl('https://giphy.com/gifs/cute-cat-AbCd123'), 'AbCd123');
  assert.equal(giphyIdFromUrl('https://media.giphy.com/media/AbCd123/giphy.gif'), 'AbCd123');
  assert.equal(giphyIdFromUrl('https://example.test/media/AbCd123/giphy.gif'), undefined);
});
