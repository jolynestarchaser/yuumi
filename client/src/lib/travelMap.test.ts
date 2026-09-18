import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTravelIntent, globeClick, normalizeTravelPin, projectPin, readTravelMap, retryTravelIntent, shouldClearTravelDraft, type TravelPin } from './travelMap.js';
test('travel map rejects malformed pins and bounds rotation', () => {
  const state = readTravelMap('{"rotation":{"lon":7,"lat":99},"pins":[{"name":"Bangkok","note":"x","emoji":"📍","status":"visited","lat":13.7,"lon":100.5},{"name":2}]}');
  assert.equal(state.rotation.lat, 70); assert.equal(state.pins.length, 1);
});
test('globe conversion only accepts clicks on its sphere and projects front pins', () => {
  const rotation = { lon: 0, lat: 0 }, rect = { left: 0, top: 0, width: 200, height: 200 };
  assert.deepEqual(globeClick(100, 100, rect, rotation), { lat: 0, lon: 0 });
  assert.equal(globeClick(0, 0, rect, rotation), null);
  assert.equal(projectPin(0, 0, rotation).visible, true);
  assert.equal(projectPin(0, 180, rotation).visible, false);
});

const pin = (id: string, name = id): TravelPin => ({ id, name, note: '', emoji: '📍', status: 'planned', lat: 1, lon: 2 });

test('offline add rebases over a disjoint partner add', () => {
  const remote = { ...readTravelMap(JSON.stringify({ version: 2, pins: [pin('partner')] })) };
  const result = applyTravelIntent(remote, { operationId: 'op-local', type: 'add', pinId: 'local', pin: pin('local') });
  assert.deepEqual(result.map.pins.map((entry) => entry.id), ['partner', 'local']);
  assert.equal(result.conflict, undefined);
});

test('same-pin update and edit/remove conflicts preserve local and remote values', () => {
  const base = pin('same', 'base');
  const remotePin = pin('same', 'remote');
  const remote = readTravelMap(JSON.stringify({ version: 2, pins: [remotePin] }));
  const update = applyTravelIntent(remote, { operationId: 'op-update', type: 'update', pinId: 'same', basePin: base, pin: pin('same', 'local') });
  assert.equal(update.map.pins[0].name, 'remote');
  assert.equal(update.conflict?.local?.name, 'local');
  const remove = applyTravelIntent(remote, { operationId: 'op-remove', type: 'remove', pinId: 'same', basePin: base });
  assert.equal(remove.map.pins[0].name, 'remote');
  assert.equal(remove.conflict?.remote?.name, 'remote');
});

test('status transitions retain only the date valid for the current status', () => {
  const visited = normalizeTravelPin({ ...pin('trip'), status: 'visited', plannedDate: '2026-01-01', visitedDate: '2026-02-02' });
  assert.equal(visited.plannedDate, undefined);
  assert.equal(visited.visitedDate, '2026-02-02');
  const planned = normalizeTravelPin({ ...visited, status: 'planned', plannedDate: '2026-03-03' });
  assert.equal(planned.visitedDate, undefined);
  assert.equal(planned.plannedDate, '2026-03-03');
});

test('unsafe legacy inputs expose diagnostics and remain read-only', () => {
  for (const content of [
    '{bad',
    JSON.stringify({ version: 2, pins: [pin('duplicate'), pin('duplicate')] }),
    JSON.stringify({ version: 2, pins: Array.from({ length: 101 }, (_, index) => pin(`pin-${index}`)) }),
    JSON.stringify({ version: 99, pins: [] }),
  ]) {
    const parsed = readTravelMap(content);
    assert.equal(parsed.readOnly, true);
    assert.ok(parsed.diagnostics?.length);
  }
});

test('delayed pin A acknowledgement cannot clear a newer pin B draft', () => {
  const draftA = { name: 'A' }, draftB = { name: 'B' };
  assert.equal(shouldClearTravelDraft('a', draftA, 'b', draftB), false);
  assert.equal(shouldClearTravelDraft('a', draftA, 'a', draftA), true);
});

test('exact retry preserves operation ID while a rebase creates a new operation', () => {
  const intent = { operationId: 'original-operation', type: 'add' as const, pinId: 'a', pin: pin('a') };
  assert.equal(retryTravelIntent(intent, 4, 4, () => 'new-operation').operationId, 'original-operation');
  assert.equal(retryTravelIntent(intent, 4, 5, () => 'new-operation').operationId, 'new-operation');
});
