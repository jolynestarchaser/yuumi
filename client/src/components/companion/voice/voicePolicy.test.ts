import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canPlayVocalization } from './voicePolicy.js';

test('a first chirp plays, repeated ambient and rapid duplicate chirps do not', () => {
  assert.equal(canPlayVocalization('idle', 100, undefined, undefined, -1, 0, -1), true);
  assert.equal(canPlayVocalization('idle', 30100, 100, 100, 0, 0, -1), false);
  assert.equal(canPlayVocalization('idle', 60100, 100, 100, 0, 0, -1), true);
  assert.equal(canPlayVocalization('thinking', 1200, 1000, 1000, 1, 0, -1), false);
});

test('important feedback interrupts ambient or thinking but not another important sound', () => {
  assert.equal(canPlayVocalization('success', 1100, undefined, 1000, 1, 1500, 1), true);
  assert.equal(canPlayVocalization('idle', 1100, undefined, 1000, 4, 1500, 4), false);
  assert.equal(canPlayVocalization('confused', 1200, undefined, 1000, 4, 1500, 4), false);
  assert.equal(canPlayVocalization('greeting', 1100, undefined, 1000, 4, 1500, 4, true), true);
});
