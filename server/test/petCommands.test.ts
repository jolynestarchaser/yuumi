import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Companion from '../src/models/Companion.js';
import CompanionOperationReceipt from '../src/models/CompanionOperationReceipt.js';
import { getCompanion, interactWithCompanion } from '../src/controllers/companionController.js';
import { initialCompanion } from '../src/services/companionState.js';
import { initializePetProgression } from '../src/services/petProgression.js';
import type { StoredCompanion } from '../../shared/contracts.js';

test('gameplay commands share one transaction, replay receipts, reject conflicts and isolate foreign pets', async (t) => {
  const enabled = process.env.PET_GAMEPLAY_ENABLED;
  process.env.PET_GAMEPLAY_ENABLED = 'true';
  t.after(() => { if (enabled === undefined) delete process.env.PET_GAMEPLAY_ENABLED; else process.env.PET_GAMEPLAY_ENABLED = enabled; });
  const id = 'companion-00000000-0000-4000-8000-000000000001';
  const at = new Date();
  let stored: StoredCompanion = initializePetProgression({ ...initialCompanion(), _id: id, bornAt: at, lockedUntil: new Date(0) }, at, false, 'command-test');
  const receipts: any[] = [];
  const query = (read: () => unknown) => { const q = { lean: async () => structuredClone(read()), session: () => q }; return q; };
  const matches = (filter: any) => filter._id === stored._id && (!filter.familyId || filter.familyId === stored.familyId)
    && (!filter.lockToken || filter.lockToken === stored.lockToken) && (!filter.lockedUntil?.$lte || new Date(stored.lockedUntil!) <= filter.lockedUntil.$lte);
  t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async (work: () => Promise<void>) => work(), endSession: async () => {} }));
  t.mock.method(Companion, 'findById', (requested: string) => query(() => requested === id ? stored : null));
  t.mock.method(Companion, 'findOneAndUpdate', (filter: any, update: any) => query(() => {
    if (!matches(filter)) return null;
    stored = { ...stored, ...structuredClone(update.$set || {}) };
    return stored;
  }));
  t.mock.method(Companion, 'updateOne', async (filter: any, update: any) => {
    if (!matches(filter)) return { matchedCount: 0 };
    stored = { ...stored, ...structuredClone(update.$set || {}) };
    for (const key of Object.keys(update.$unset || {})) delete stored[key];
    return { matchedCount: 1 };
  });
  t.mock.method(CompanionOperationReceipt, 'findOne', (filter: any) => query(() => receipts.find((entry) => entry.operationId === filter.operationId && entry.companionId === filter.companionId) || null));
  t.mock.method(CompanionOperationReceipt, 'create', async (entries: any[]) => { receipts.push(...structuredClone(entries)); return entries; });
  const response = () => ({ code: 200, body: undefined as any, set() { return this; }, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } });
  const request = async (profile: 'joe' | 'focus', body: object) => { const res = response(); await interactWithCompanion({ desktop: { profile }, body: { companionId: id, ...body } }, res); return res; };
  const first = await request('joe', { action: 'feed', operationId: 'feed-operation-0001', expectedRevision: 0 });
  assert.equal(first.code, 200, JSON.stringify(first.body)); assert.equal(stored.xp, 12);
  const revision = stored.revision;
  assert.equal((await request('joe', { action: 'feed', operationId: 'feed-operation-0001', expectedRevision: 0 })).code, 200);
  assert.equal(stored.xp, 12); assert.equal(stored.revision, revision);
  assert.equal((await request('focus', { action: 'feed', operationId: 'feed-operation-0001', expectedRevision: 0 })).code, 409);
  assert.equal((await request('focus', { action: 'cuddle', operationId: 'stale-operation-0001', expectedRevision: 0 })).code, 409);
  const contenders = await Promise.all([
    request('focus', { action: 'cuddle', operationId: 'focus-operation-0001', expectedRevision: revision }),
    request('focus', { action: 'clean', operationId: 'focus-operation-0002', expectedRevision: revision }),
  ]);
  assert.deepEqual(contenders.map((entry) => entry.code).sort(), [200, 409]);
  assert.equal(receipts.length, 2);
  assert.ok(!JSON.stringify(first.body).includes('command-test')); assert.ok(!JSON.stringify(first.body).includes('seedSecret'));
  stored = { ...stored, familyId: 'some-other-family' };
  const foreign = response(); await getCompanion({ query: { id } }, foreign);
  assert.equal(foreign.code, 404);
});
