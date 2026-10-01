import assert from 'node:assert/strict';
import test from 'node:test';
import { bangkokDay, messageStreak } from '../src/services/messageStreak.js';

test('Bangkok day changes at Bangkok midnight', () => {
  assert.equal(bangkokDay(new Date('2026-09-30T16:59:59Z')), '2026-09-30');
  assert.equal(bangkokDay(new Date('2026-09-30T17:00:00Z')), '2026-10-01');
});

test('either sender keeps one shared daily streak and both statuses are reported', () => {
  const now = new Date('2026-10-01T08:00:00Z');
  assert.deepEqual(messageStreak([
    { day: '2026-09-29', senders: ['focus'] },
    { day: '2026-09-30', senders: ['joe'] },
    { day: '2026-10-01', senders: ['joe', 'focus'] }
  ], now), { count: 3, day: '2026-10-01', today: { joe: true, focus: true } });
  assert.equal(messageStreak([{ day: '2026-10-01', senders: ['joe'] }], now).count, 1);
});

test('yesterday remains active today, then a missed day resets the streak', () => {
  const now = new Date('2026-10-01T08:00:00Z');
  assert.equal(messageStreak([{ day: '2026-09-30', senders: ['focus'] }], now).count, 1);
  assert.equal(messageStreak([{ day: '2026-09-29', senders: ['focus'] }], now).count, 0);
});
