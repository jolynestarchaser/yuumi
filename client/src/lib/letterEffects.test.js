import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCelebrationParticles,
  getNextUnreadMessage,
  playLetterChime,
  resolveLetterEffect
} from './letterEffects.js';

test('unknown effects fall back to hearts', () => {
  const effect = resolveLetterEffect('unknown');
  assert.equal(effect.name, 'hearts');
  assert.ok(effect.glyphs.includes('💚'));
});

test('emoji rain starts with the sender-selected emoji', () => {
  const effect = resolveLetterEffect('emoji-rain', '🐈');
  assert.equal(effect.glyphs[0], '🐈');
});

test('celebration particles are deterministic and bounded', () => {
  const first = createCelebrationParticles({ effect: 'stars', count: 12 });
  const second = createCelebrationParticles({ effect: 'stars', count: 12 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 12);
  assert.ok(first.every((particle) => particle.x >= 0 && particle.x < 96));
});

test('none effect produces no particles', () => {
  assert.deepEqual(createCelebrationParticles({ effect: 'none' }), []);
});

test('next unread skips read and session-dismissed messages', () => {
  const messages = [
    { _id: 'newest', readAt: '2026-09-13T00:00:00Z' },
    { _id: 'dismissed', readAt: null },
    { _id: 'next', readAt: null }
  ];
  assert.equal(getNextUnreadMessage(messages, new Set(['dismissed']))?._id, 'next');
  assert.equal(getNextUnreadMessage([], new Set()), null);
});

test('letter chime schedules three notes when audio is available', async () => {
  class FakeAudioContext {
    static latest;

    constructor() {
      FakeAudioContext.latest = this;
      this.state = 'suspended';
      this.currentTime = 1;
      this.destination = {};
      this.oscillators = [];
    }

    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
    createOscillator() {
      const oscillator = {
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {}
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  }

  assert.equal(await playLetterChime({ AudioContextClass: FakeAudioContext }), true);
  assert.equal(FakeAudioContext.latest.oscillators.length, 3);
  assert.equal(await playLetterChime({ enabled: false, AudioContextClass: FakeAudioContext }), false);
});

test('letter chime fails silently when audio initialization is blocked', async () => {
  class BlockedAudioContext {
    constructor() { throw new Error('blocked'); }
  }
  assert.equal(await playLetterChime({ AudioContextClass: BlockedAudioContext }), false);
});
