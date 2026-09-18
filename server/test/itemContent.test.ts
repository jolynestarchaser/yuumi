import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Item from '../src/models/Item.js';
import ItemOperation from '../src/models/ItemOperation.js';
import { revisionService } from '../src/services/historyService.js';
import { commitItemContent, ItemRevisionConflict, updateItemContent } from '../src/services/itemContent.js';

const id = '507f1f77bcf86cd799439011';

test('item content writes require a revision and reject oversized note text before updating', async (t) => {
  let updates = 0;
  t.mock.method(Item, 'findOne', () => ({ select: async () => ({ type: 'note' }) }));
  t.mock.method(Item, 'findOneAndUpdate', async () => { updates += 1; return null; });
  await assert.rejects(updateItemContent({ id, expectedRevision: undefined as never, patch: { content: 'hello' }, actor: 'joe' }), /Expected revision/);
  await assert.rejects(updateItemContent({ id, expectedRevision: 0, patch: { content: 'x'.repeat(10001) }, actor: 'joe' }), /10,000/);
  assert.equal(updates, 0);
});

test('revision zero deliberately matches legacy records without contentRevision', async (t) => {
  let filter;
  const saved = { _id: id, type: 'note', content: 'hello', contentRevision: 1 };
  t.mock.method(Item, 'findOne', () => ({ select: async () => ({ type: 'note' }) }));
  t.mock.method(Item, 'findOneAndUpdate', async (value) => { filter = value; return saved; });
  assert.equal(await updateItemContent({ id, expectedRevision: 0, patch: { content: 'hello' }, actor: 'focus' }), saved);
  assert.deepEqual(filter.$or, [{ contentRevision: 0 }, { contentRevision: { $exists: false } }]);
});

test('a stale concurrent content writer receives the current item', async (t) => {
  const current = { _id: id, type: 'note', content: 'newer', contentRevision: 3, deletedAt: null };
  t.mock.method(Item, 'findOne', () => ({ select: async () => ({ type: 'note' }) }));
  t.mock.method(Item, 'findOneAndUpdate', async () => null);
  t.mock.method(Item, 'findById', async () => current);
  await assert.rejects(
    updateItemContent({ id, expectedRevision: 2, patch: { content: 'stale' }, actor: 'joe' }),
    (error) => error instanceof ItemRevisionConflict && error.current === current
  );
});

test('committed item operations replay one immutable response without another write or history row', async (t) => {
  const operations = [];
  let writes = 0;
  let historyRows = 0;
  const stored = { _id: id, type: 'note', name: 'Note', content: 'saved', contentRevision: 2, position: { x: 0, y: 0, revision: 0 }, toObject() { return { ...this, toObject: undefined }; } };
  const findOperation = (query) => operations.find((entry) => String(entry.entityId) === String(query.entityId) && entry.actor === query.actor && entry.operationId === query.operationId) || null;
  t.mock.method(ItemOperation, 'findOne', (query) => ({ lean: async () => findOperation(query) }));
  t.mock.method(ItemOperation, 'create', async ([value]) => { operations.push(value); return [value]; });
  t.mock.method(Item, 'findOne', () => ({ select: async () => ({ type: 'note' }) }));
  t.mock.method(Item, 'findOneAndUpdate', async () => { writes += 1; return stored; });
  t.mock.method(revisionService, 'record', async () => { historyRows += 1; });
  t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async (callback) => callback(), endSession: async () => {} }));
  const input = { id, expectedRevision: 1, operationId: 'save-note-0001', patch: { content: 'saved' }, actor: 'joe' as const };
  const first = await commitItemContent(input);
  const replay = await commitItemContent(input);
  assert.equal(first.replay, false);
  assert.equal(replay.replay, true);
  assert.equal(writes, 1);
  assert.equal(historyRows, 1);
  assert.deepEqual(replay.item, first.item);
});
