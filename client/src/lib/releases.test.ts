import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledgeRelease, currentRelease, hasUnseenRelease } from './releases.js';

test('release alerts are acknowledged independently for Joe and Focus', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  assert.equal(hasUnseenRelease('joe', storage), true);
  acknowledgeRelease('joe', storage);
  assert.equal(hasUnseenRelease('joe', storage), false);
  assert.equal(hasUnseenRelease('focus', storage), true);
  assert.equal(values.get('yuu-mi:last-update:joe'), currentRelease.id);
  storage.setItem('yuu-mi:last-update:joe', 'older-release');
  assert.equal(hasUnseenRelease('joe', storage), true);
});

test('unavailable storage does not prevent login or dismissal', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(hasUnseenRelease('joe', storage), true);
  assert.doesNotThrow(() => acknowledgeRelease('joe', storage));
});
