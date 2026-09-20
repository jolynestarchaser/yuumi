import assert from 'node:assert/strict';
import test from 'node:test';
import type { CompanionSnapshot } from '../../../shared/contracts.js';
import { mergeCompanionSnapshot, operationKey, readCompanionRoster, readCompanionSnapshot, readRememberedCompanion, rememberCompanion, resolveCompanionId } from './companionState.js';

const snapshot = (id: string, revision: number) => ({ companion: { id, revision }, capabilities: {} }) as CompanionSnapshot;

test('companion revisions are monotonic only within the same identity', () => {
  let state = mergeCompanionSnapshot({}, 'a', snapshot('a', 20));
  state = mergeCompanionSnapshot(state, 'b', snapshot('b', 1));
  assert.equal(state.a.companion.revision, 20);
  assert.equal(state.b.companion.revision, 1);

  state = mergeCompanionSnapshot(state, 'a', snapshot('a', 21));
  assert.equal(state.a.companion.revision, 21);
  assert.equal(state.b.companion.revision, 1);

  state = mergeCompanionSnapshot(state, 'b', snapshot('b', 21));
  assert.equal(state.a.companion.revision, 21);
  assert.equal(state.b.companion.revision, 21);
});

test('delayed or mismatched companion responses cannot overwrite the selected identity', () => {
  const selectedId = 'b';
  let state = mergeCompanionSnapshot({}, selectedId, snapshot('b', 1));
  const unchanged = mergeCompanionSnapshot(state, 'a', snapshot('b', 99));
  assert.equal(unchanged, state);
  state = mergeCompanionSnapshot(state, 'a', snapshot('a', 20));
  assert.equal(state[selectedId].companion.id, 'b');
});

test('revision-zero companions and missing remembered IDs resolve safely', () => {
  const state = mergeCompanionSnapshot({}, 'new', snapshot('new', 0));
  assert.equal(state.new.companion.revision, 0);
  assert.equal(resolveCompanionId('deleted', [{ id: 'safe' } as never]), 'safe');
});

test('operations and retries are scoped by companion identity', () => {
  assert.notEqual(operationKey('a', 'chat', { text: 'hi' }), operationKey('b', 'chat', { text: 'hi' }));
});

test('blocked browser storage falls back without throwing', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readRememberedCompanion(blocked), 'joe-and-focus');
  assert.doesNotThrow(() => rememberCompanion(blocked, 'safe'));
});

test('companion API readers reject malformed detail and roster payloads', () => {
  assert.equal(readCompanionSnapshot({ companion: { id: 'pet', revision: 1 }, capabilities: { chat: true, portraits: false } })?.companion.id, 'pet');
  assert.equal(readCompanionSnapshot({ companion: { id: 'pet' }, capabilities: {} }), null);
  assert.deepEqual(readCompanionRoster({ companions: [{ id: 'pet', name: 'Pip', revision: 0 }] })?.map((entry) => entry.id), ['pet']);
  assert.equal(readCompanionRoster([]), null);
  assert.equal(readCompanionRoster({ companions: [null] }), null);
});
