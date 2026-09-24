import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCompanion, publicCompanion } from '../src/services/companionState.js';
import { completeDailyRitual, currentDailyRitual } from '../src/services/companionRitual.js';

test('daily ritual is stable within a UTC day and changes at midnight', () => {
  const state = { ...initialCompanion(), _id: 'companion-test', bornAt: new Date('2026-09-23T12:00:00Z') };
  const morning = currentDailyRitual(state, new Date('2026-09-24T01:00:00Z'));
  const evening = currentDailyRitual(state, new Date('2026-09-24T23:59:59Z'));
  assert.deepEqual(morning, evening);
  assert.equal(morning?.day, '2026-09-24');
  assert.equal(currentDailyRitual(state, new Date('2026-09-25T00:00:00Z'))?.day, '2026-09-25');
});

test('only matching care completes a ritual and records one shared memory', () => {
  const now = new Date('2026-09-24T09:00:00Z');
  const state = { ...initialCompanion(), _id: 'companion-test', bornAt: new Date('2026-09-23T12:00:00Z') };
  const ritual = currentDailyRitual(state, now)!;
  const other = ritual.action === 'feed' ? 'play' : 'feed';
  assert.equal(completeDailyRitual(state, other, 'joe', now), state);
  const completed = completeDailyRitual(state, ritual.action, 'focus', now);
  assert.equal(completed.dailyRitual?.completedBy, 'focus');
  assert.equal(completed.memories.length, 1);
  assert.equal(completeDailyRitual(completed, ritual.action, 'joe', now), completed);
  assert.equal(publicCompanion(completed, now).dailyRitual?.completedBy, 'focus');
  assert.equal(currentDailyRitual(completed, new Date('2026-09-25T00:00:00Z'))?.completedAt, undefined);
});

test('unhatched, archived, and terminal companions have no daily ritual', () => {
  const now = new Date('2026-09-24T09:00:00Z');
  const state = initialCompanion();
  assert.equal(currentDailyRitual(state, now), null);
  const born = { ...state, bornAt: now };
  assert.equal(currentDailyRitual({ ...born, archivedAt: now }, now), null);
  assert.equal(currentDailyRitual({ ...born, lifecycle: { ...born.lifecycle!, lifeStatus: 'retired' as const } }, now), null);
});
