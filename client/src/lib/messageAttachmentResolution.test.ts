import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptsUrlAttachmentResult, attachmentFromProviderUrl, beginUrlAttachmentRequest, isGiphyUrl, isMessageSendBlocked, isRemoteMediaCandidate, messageOperationForSnapshot } from './messageAttachmentResolution.js';

test('provider links stay out of the generic URL importer', () => {
  assert.deepEqual(attachmentFromProviderUrl('https://giphy.com/gifs/cat-abc123'), { kind: 'giphy', gifId: 'abc123' });
  assert.deepEqual(attachmentFromProviderUrl('https://open.spotify.com/track/abc'), { kind: 'spotify', spotifyUrl: 'https://open.spotify.com/track/abc' });
  assert.equal(attachmentFromProviderUrl('https://cdn.example.test/pet.webp'), undefined);
});

test('direct image and audio HTTPS URLs are candidates for the secure importer only', () => {
  for (const extension of ['jpg', 'png', 'webp', 'gif', 'mp3', 'wav', 'ogg', 'm4a']) assert.equal(isRemoteMediaCandidate(`https://cdn.example.test/us.${extension}`), true, extension);
  for (const value of ['file:///C:/photo.png', 'blob:https://example.test/id', 'C:\\photo.png', 'https://giphy.com/gifs/cat-abc123', 'https://giphy.com/gifs/not-a-valid-id-', 'https://open.spotify.com/track/abc']) assert.equal(isRemoteMediaCandidate(value), false, value);
  assert.equal(isGiphyUrl('https://giphy.com/gifs/not-a-valid-id-'), true);
});

test('a lost import response retries the same URL with the original operation ID', () => {
  const first = beginUrlAttachmentRequest(null, 'joe', 'https://cdn.example.test/pet.png', () => 'first');
  const retry = beginUrlAttachmentRequest({ ...first, status: 'failed' }, 'joe', 'https://cdn.example.test/pet.png', () => 'second');
  assert.equal(retry.operationId, first.operationId);
  assert.notEqual(retry.generation, first.generation);
});

test('a stale URL A result or a canceled request cannot replace URL B', () => {
  const a = beginUrlAttachmentRequest(null, 'joe', 'https://cdn.example.test/a.png', () => 'a');
  const b = beginUrlAttachmentRequest(a, 'joe', 'https://cdn.example.test/b.png', () => 'b');
  assert.equal(acceptsUrlAttachmentResult(b, a, 'https://cdn.example.test/b.png'), false);
  assert.equal(acceptsUrlAttachmentResult(null, b, 'https://cdn.example.test/b.png'), false);
  assert.equal(acceptsUrlAttachmentResult(b, b, 'https://cdn.example.test/b.png'), true);
});

test('failed/replaced URL drafts block send, while resolved attachment-only messages can send', () => {
  assert.equal(isMessageSendBlocked({ body: '', hasAttachment: false, urlValue: 'https://cdn.example.test/a.png', resolvedUrlAttachment: false, resolving: false }), true);
  assert.equal(isMessageSendBlocked({ body: '', hasAttachment: true, urlValue: 'https://cdn.example.test/a.png', resolvedUrlAttachment: true, resolving: false }), false);
  assert.equal(isMessageSendBlocked({ body: 'kept draft', hasAttachment: false, urlValue: '', resolvedUrlAttachment: false, resolving: false }), false);
});

test('lost send retry reuses one operation ID and a changed snapshot gets a new one', () => {
  const initial = messageOperationForSnapshot(null, 'joe', { body: 'only us', attachment: { kind: 'image', assetId: 'asset-a' } }, () => 'one');
  const replay = messageOperationForSnapshot(initial, 'joe', { body: 'only us', attachment: { kind: 'image', assetId: 'asset-a' } }, () => 'two');
  const altered = messageOperationForSnapshot(initial, 'joe', { body: 'changed', attachment: { kind: 'image', assetId: 'asset-a' } }, () => 'three');
  assert.equal(replay.operationId, initial.operationId);
  assert.notEqual(altered.operationId, initial.operationId);
});
