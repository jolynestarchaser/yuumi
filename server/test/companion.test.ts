import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import type { Profile, Temperament, ApiResponse, CompanionSnapshot } from '../../shared/contracts.js';
import type { AddressInfo } from 'node:net';
import Companion from '../src/models/Companion.js';
import CompanionFamily from '../src/models/CompanionFamily.js';
import CompanionOperationReceipt from '../src/models/CompanionOperationReceipt.js';
import companionRoutes from '../src/routes/companions.js';
import { createCompanion, interactWithCompanion, nextBudget } from '../src/controllers/companionController.js';
import { brainContext, chatWithCompanion, generateContent, geminiFailureMessage, incompleteGeminiResponseMessage, parseBrainReply } from '../src/services/companionBrain.js';
import { careFor, forgetMemory, initialCompanion, publicCompanion, refreshCareRequest, remember, settledState, startingTraits, validateSetup } from '../src/services/companionState.js';
import { companionMigrationPatch } from '../src/services/companionMigration.js';
import { evolveCompanion } from '../src/services/companionEvolution.js';

test('time away preserves safe needs and relationships; repeated reads do not compound decay', () => {
  const state = { ...initialCompanion(), lifecycle: undefined, bornAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), needsUpdatedAt: new Date('2026-01-01'), bonds: { joe: 7, focus: 5 } };
  const later = new Date('2027-01-01');
  const settled = settledState(state, later);
  assert.deepEqual(settledState(settled, later), settled);
  assert.deepEqual(settled.needs, { fullness: 20, energy: 32, joy: 27, comfort: 39, hygiene: 100, health: 100 });
  assert.deepEqual(settledState(state, later).bonds, state.bonds);
  assert.equal(state.needs.fullness, 75);
});

test('settlement integrates rest and awake time piecewise and freezes archives', () => {
  const start = new Date('2026-01-01T00:00:00Z');
  const state = { ...initialCompanion(), lifecycle: undefined, bornAt: start, needsUpdatedAt: start, behaviorState: 'resting' as const, restUntil: new Date('2026-01-01T00:45:00Z'), needs: { fullness: 75, energy: 40, joy: 75, comfort: 75, hygiene: 100, health: 100 } };
  const long = settledState(state, new Date('2026-01-01T02:00:00Z'));
  const short = settledState(settledState(state, new Date('2026-01-01T00:45:00Z')), new Date('2026-01-01T02:00:00Z'));
  assert.deepEqual(long.needs, short.needs);
  assert.equal(long.needs.energy, 46.5);
  const archived = { ...state, archivedAt: start };
  assert.deepEqual(settledState(archived, new Date('2026-02-01T00:00:00Z')).needs, archived.needs);
  assert.equal(new Date(settledState(archived, new Date('2026-02-01T00:00:00Z')).needsUpdatedAt).getTime(), start.getTime());
});

test('meaningful care eligibility uses settled values and requires improvement', () => {
  const now = new Date('2026-01-01T03:00:00Z');
  const state = { ...initialCompanion(), lifecycle: undefined, bornAt: new Date('2026-01-01T00:00:00Z'), needsUpdatedAt: new Date('2026-01-01T00:00:00Z'), needs: { fullness: 90, energy: 80, joy: 75, comfort: 75, hygiene: 100, health: 100 }, xpBudget: { day: '2026-01-01', care: 0, chat: 0 } };
  assert.equal(careFor(state, 'joe', 'feed', now).xp, 8);
  assert.equal(careFor({ ...state, needsUpdatedAt: now, needs: { ...state.needs, fullness: 100 } }, 'joe', 'feed', now).xp, 0);
});

test('repeated rest does not extend an active nap or grant rewards', () => {
  const now = new Date('2026-01-01T00:05:00Z');
  const restUntil = new Date('2026-01-01T00:45:00Z');
  const state = { ...initialCompanion(), xp: 8, behaviorState: 'resting' as const, restUntil, needsUpdatedAt: new Date('2026-01-01T00:00:00Z') };
  const repeated = careFor(state, 'joe', 'rest', now);
  assert.equal(repeated.xp, 8);
  assert.equal(new Date(repeated.restUntil).getTime(), restUntil.getTime());
  assert.equal(repeated.memories.length, 0);
});

test('care changes specific traits, identifies the caregiver, and does not mutate prior state', () => {
  const original = initialCompanion();
  const cared = careFor(original, 'focus', 'explore');
  assert.equal(cared.traits.curiosity, 52);
  assert.equal(cared.traits.affection, 50);
  assert.equal(cared.bonds.focus, 1);
  assert.equal(cared.bonds.joe, 0);
  assert.equal(cared.memories[0].actor, 'focus');
  assert.equal(original.memories.length, 0);
  assert.equal(original.traits.curiosity, 50);
  assert.throws(() => careFor(original, 'stranger' as Profile, 'feed'));
});

test('forgetting removes the memory and derived conversational context', () => {
  let state = remember(initialCompanion(), 'joe', 'conversation', 'Secret phrase', new Date(), 'forget-me');
  state.turns = [{ id: 'test-turn', at: new Date(), text: 'You said Secret phrase', actor: 'companion' }];
  state.thought = 'Secret phrase';
  state = forgetMemory(state, 'forget-me');
  assert.doesNotMatch(brainContext(state, 'focus', 'Hello'), /Secret phrase/);
  assert.equal(state.turns.length, 0);
});

test('brain context includes the companion current need without private desktop data', () => {
  const state = initialCompanion();
  state.needs.fullness = 30;
  assert.match(brainContext(state, 'joe', 'Hello'), /"currentNeed":"snack"/);
});

test('care requests have stable identity, resolve with hysteresis, and reward once', () => {
  const now = new Date('2026-09-18T10:00:00Z');
  const hungry = { ...initialCompanion(), needs: { fullness: 35, energy: 80, joy: 75, comfort: 75, hygiene: 100, health: 100 }, needsUpdatedAt: now };
  const requested = refreshCareRequest(hungry, now);
  assert.equal(requested.careRequest?.action, 'feed');
  assert.equal(refreshCareRequest(requested, now).careRequest?.id, requested.careRequest?.id);
  const cared = careFor(requested, 'joe', 'feed', now);
  assert.equal(cared.careRequest?.state, 'fulfilled');
  assert.equal(cared.xp, 12);
  assert.equal(cared.xpBudget?.care, 12);
  assert.equal(cared.careSummary?.actions.feed, 1);
  assert.equal(careFor(cared, 'focus', 'feed', now).xp, 20);
});

test('care XP caps while rest has a real wake condition', () => {
  const now = new Date('2026-09-18T10:00:00Z');
  const state = { ...initialCompanion(), lifecycle: undefined, bornAt: now, xp: 20, xpBudget: { day: '2026-09-18', care: 40, chat: 0 }, needs: { fullness: 40, energy: 30, joy: 40, comfort: 40, hygiene: 100, health: 100 }, needsUpdatedAt: now };
  const capped = careFor(state, 'joe', 'rest', now);
  assert.equal(capped.xp, 20);
  assert.equal(capped.behaviorState, 'resting');
  const awake = settledState(capped, new Date(now.getTime() + 46 * 60_000));
  assert.equal(awake.behaviorState, 'active');
  assert.equal(awake.restUntil, null);
});

test('evolution persists three real stage outcomes at levels 3, 6, and 10', () => {
  const state = initialCompanion();
  state.appearance = { visualStyle: 'pixel', animated: true, usePortrait: false, species: 'dragon' };
  state.xp = 9 * 80;
  const grown = evolveCompanion({ ...state, xp: 10 * 80 }, 0, () => .2, new Date('2026-09-18'));
  assert.deepEqual(grown.stageOutcomes?.map((entry) => entry.level), [3, 6, 10]);
  assert.equal(grown.stageOutcomes?.at(-1)?.toFormId, 'dragon-grown-explorer-v2');
});

test('character creation validates its fields and seeds personality from the chosen temperament', () => {
  assert.equal(validateSetup({ name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'gentle' }), true);
  assert.equal(validateSetup({ name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'evil' as Temperament }), false);
  assert.equal(validateSetup({ name: ' '.repeat(4), form: 'creature', seed: 'Teal dragon', temperament: 'curious' }), false);
  assert.equal(startingTraits('gentle').affection, 65);
});

test('public state omits leases, retry IDs, and usage metadata', () => {
  const output = publicCompanion({ ...initialCompanion(), _id: 'companion-test', lockToken: 'private', budget: { day: '2026-09-17', chats: 3, portraits: 0 }, lastCare: {}, recentOperations: ['private'], lockedUntil: new Date(), createdOperationId: 'private-create' });
  for (const key of ['lockToken', 'budget', 'lastCare', 'recentOperations', 'lockedUntil', 'familyId', 'schemaVersion', 'needsUpdatedAt', 'createdOperationId']) assert.equal(key in output, false);
  assert.equal(output.id, 'companion-test');
});

test('legacy companion migration is explicit and idempotent', () => {
  const updatedAt = new Date('2026-01-01T00:00:00Z');
  const legacy = { ...initialCompanion(), familyId: undefined, schemaVersion: undefined, archivedAt: undefined, needsUpdatedAt: undefined, updatedAt, needs: { fullness: 60, energy: 50, joy: 40, comfort: 75, hygiene: 100, health: 100 } };
  const patch = companionMigrationPatch(legacy as never);
  assert.equal(patch.familyId, 'joe-and-focus');
  assert.equal(patch.schemaVersion, 3);
  assert.equal(patch.archivedAt, null);
  const migrated = { ...legacy, ...patch };
  assert.deepEqual(companionMigrationPatch(migrated), {});
  assert.throws(() => companionMigrationPatch({ ...migrated, schemaVersion: 4 }), /newer than supported/);
});

test('legacy companions use the authored soft form when appearance settings are absent', () => {
  const legacy = initialCompanion();
  legacy.lifecycle = undefined;
  delete legacy.appearance;
  assert.deepEqual(publicCompanion(legacy).appearance, { visualStyle: 'soft', animated: true, usePortrait: false });
  legacy.portrait = { url: 'https://example.test/pixel.png', publicId: 'original', createdAt: new Date() };
  assert.deepEqual(publicCompanion(legacy).appearance, { visualStyle: 'soft', animated: true, usePortrait: false });
  assert.equal(legacy.appearance, undefined);
});

test('public companion derives a visible evolution form from level and care path', () => {
  const state = initialCompanion();
  state.lifecycle = undefined;
  state.xp = 9 * 80;
  state.appearance = { visualStyle: 'pixel', animated: true, usePortrait: false, species: 'dragon' };
  state.evolutions = [{ level: 9, species: 'dragon', path: 'explorer', at: new Date() }];
  const companion = publicCompanion(state);
  assert.equal(companion.growthStage, 'grown');
  assert.equal(companion.formId, 'dragon-grown-explorer');
  assert.equal(companion.stage, 'Grown companion');
});

test('AI requests are capped per shared day, cooldowns apply, and a new day resets usage', () => {
  const now = new Date('2026-09-17T10:00:00Z');
  assert.throws(() => nextBudget({ day: '2026-09-17', chats: 60 }, 'chats', now), /allowance/);
  assert.throws(() => nextBudget({ day: '2026-09-17', portraits: 5 }, 'portraits', now), /allowance/);
  assert.throws(() => nextBudget({ day: '2026-09-17', chats: 1, lastChat: now }, 'chats', now), /moment/);
  assert.equal(nextBudget({ day: '2026-09-16', chats: 60 }, 'chats', now).chats, 1);
});

test('AI output cannot inject stats, invent memory records, or use unsupported moods', () => {
  const reply = parseBrainReply([{ text: JSON.stringify({ reply: 'Hello', thought: 'A moon adventure', mood: 'curious', xp: 999, memories: ['fabricated'] }) }]);
  assert.deepEqual(Object.keys(reply).sort(), ['mood', 'reply', 'thought']);
  assert.throws(() => parseBrainReply([{ text: '{"reply":"Hello","thought":"x","mood":"angry"}' }]), /muddled/);
});

test('Gemini uses a server header and provider errors never expose the key', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fake-test-key';
  try {
    await assert.rejects(generateContent('test-model', {}, { fetchImpl: async (url, options) => {
      assert.equal(url.includes('fake-test-key'), false);
      assert.equal(new Headers(options.headers).get('x-goog-api-key'), 'fake-test-key');
      return { ok: false, status: 403, json: async () => ({}) };
    } }), (error) => error instanceof Error && 'status' in error && error.status === 502 && /rejected the server API key/.test(error.message) && !error.message.includes('fake-test-key'));
  } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});

test('Gemini provider errors identify the corrective server setting without exposing secrets', () => {
  assert.match(geminiFailureMessage(401), /API key/);
  assert.match(geminiFailureMessage(404), /GEMINI_CHAT_MODEL/);
  assert.match(geminiFailureMessage(429), /usage limit/);
  assert.match(geminiFailureMessage(503), /temporarily unavailable/);
});

test('incomplete Gemini output reports a safe actionable finish reason', () => {
  assert.match(incompleteGeminiResponseMessage({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), /response limit/);
  assert.match(incompleteGeminiResponseMessage({ candidates: [{ finishReason: 'SAFETY' }] }), /safely/);
  assert.match(incompleteGeminiResponseMessage({ promptFeedback: { blockReason: 'LANGUAGE' } }), /Thai or English/);
});

test('companion chat defaults to the verified model when no override is set', async (t) => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_CHAT_MODEL;
  process.env.GEMINI_API_KEY = 'fake-test-key';
  delete process.env.GEMINI_CHAT_MODEL;
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.match(url, /\/models\/gemini-2\.5-flash:generateContent$/);
    const body = JSON.parse(options.body as string);
    assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"reply":"Hello","mood":"curious","thought":"Hello","growth":"none"}' }] } }] }) };
  });
  try {
    const reply = await chatWithCompanion(initialCompanion(), 'joe', 'Hello');
    assert.equal(reply.reply, 'Hello');
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.GEMINI_CHAT_MODEL; else process.env.GEMINI_CHAT_MODEL = previousModel;
  }
});

test('companion routes reject unauthenticated callers without reaching MongoDB', async () => {
  const app = express();
  app.use('/api/companions', companionRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/companions`);
    assert.equal(response.status, 401);
    const ritual = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/companions/ritual`);
    assert.equal(ritual.status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('roster creation is replay-safe, capped under a family lease, and unknown action IDs do not write', async (t) => {
  const rows = [];
  const receipts = [];
  let family;
  const clone = (value) => structuredClone(value);
  const query = (read) => { const result = { session: () => result, lean: async () => clone(read()) }; return result; };
  t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async (work) => work(), endSession: async () => {} }));
  t.mock.method(CompanionOperationReceipt, 'findOne', (filter) => query(() => receipts.find((row) => row.familyId === filter.familyId && row.companionId === filter.companionId && row.operationId === filter.operationId) || null));
  t.mock.method(CompanionOperationReceipt, 'create', async (values) => { receipts.push(...clone(values)); return values; });
  const familyMatches = (query) => family
    && (!query.lockToken || family.lockToken === query.lockToken)
    && (!query.lockedUntil?.$lte || new Date(family.lockedUntil) <= query.lockedUntil.$lte)
    && (!query.lockedUntil?.$gt || new Date(family.lockedUntil) > query.lockedUntil.$gt);
  const applyFamily = (update) => { Object.assign(family, clone(update.$set || {})); for (const key of Object.keys(update.$unset || {})) delete family[key]; };
  t.mock.method(Companion, 'find', () => ({ lean: async () => [] }));
  t.mock.method(Companion, 'findOne', (filter) => query(() => rows.find((row) => row.familyId === filter.familyId && row.createdOperationId === filter.createdOperationId) || null));
  t.mock.method(Companion, 'findById', (id) => query(() => rows.find((row) => row._id === id) || null));
  t.mock.method(Companion, 'countDocuments', () => ({ session: async () => rows.filter((row) => row.familyId === 'joe-and-focus' && row.archivedAt === null && row.bornAt).length }));
  t.mock.method(Companion, 'create', async (values) => {
    const value = clone(values[0]);
    rows.push(value);
    return [{ toObject: () => clone(value) }];
  });
  t.mock.method(CompanionFamily, 'updateOne', async (query, update) => {
    if (update.$setOnInsert && !family) family = { _id: 'joe-and-focus', ...clone(update.$setOnInsert) };
    else if (familyMatches(query)) applyFamily(update);
    return { acknowledged: true, matchedCount: familyMatches(query) ? 1 : 0 };
  });
  t.mock.method(CompanionFamily, 'findOneAndUpdate', (query, update) => ({ lean: async () => {
    if (!familyMatches(query)) return null;
    applyFamily(update);
    return clone(family);
  } }));
  const response = () => ({ code: 200, body: undefined, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });
  const setup = { name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'curious' };
  const create = async (operationId) => { const res = response(); await createCompanion({ desktop: { profile: 'joe' }, body: { ...setup, operationId } }, res); return res; };
  const first = await create('create-pet-0001');
  const replay = await create('create-pet-0001');
  assert.equal(first.code, 201, JSON.stringify(first.body));
  assert.equal(replay.code, 201);
  assert.equal(first.body.data.id, replay.body.data.id);
  assert.equal(rows.length, 1);
  for (let index = 2; index <= 5; index++) assert.equal((await create(`create-pet-000${index}`)).code, 201);
  const contenders = await Promise.all([create('create-pet-0006'), create('create-pet-0007')]);
  assert.deepEqual(contenders.map((entry) => entry.code).sort(), [201, 409]);
  assert.equal(rows.length, 6);
  assert.equal((await create('create-pet-0007')).code, 409);
  const unknownId = 'companion-00000000-0000-4000-8000-000000000000';
  const unknown = response();
  await interactWithCompanion({ desktop: { profile: 'joe' }, body: { action: 'feed', companionId: unknownId, operationId: 'unknown-pet-0001' } }, unknown);
  assert.equal(unknown.code, 404);
  assert.equal(rows.length, 6);
});

// Exercise the real controller and brain adapter against an atomic in-memory
// model, with provider responses mocked. No database or paid calls are used.
test('shared actions serialize both caregivers, deduplicate retries, and preserve state on provider failure', async (t) => {
  let stored;
  let family;
  const receipts = [];
  const clone = (value) => structuredClone(value);
  const query = (read) => { const result = { session: () => result, lean: async () => clone(read()) }; return result; };
  t.mock.method(mongoose, 'startSession', async () => ({ withTransaction: async (work) => work(), endSession: async () => {} }));
  t.mock.method(CompanionOperationReceipt, 'findOne', (filter) => query(() => receipts.find((row) => row.familyId === filter.familyId && row.companionId === filter.companionId && row.operationId === filter.operationId) || null));
  t.mock.method(CompanionOperationReceipt, 'create', async (values) => { receipts.push(...clone(values)); return values; });
  const matches = (query) => stored && (!query.lockToken || stored.lockToken === query.lockToken) && (!query.lockedUntil || new Date(stored.lockedUntil) <= query.lockedUntil.$lte);
  const apply = (update) => { Object.assign(stored, clone(update.$set || {})); for (const key of Object.keys(update.$unset || {})) delete stored[key]; };
  t.mock.method(Companion, 'updateOne', async (query, update) => {
    if (update.$setOnInsert && !stored) stored = { _id: 'joe-and-focus', ...clone(update.$setOnInsert), lockedUntil: new Date(0), recentOperations: [] };
    else if (matches(query)) apply(update);
    return { acknowledged: true };
  });
  t.mock.method(Companion, 'findById', (id) => query(() => id === stored?._id ? stored : null));
  t.mock.method(Companion, 'find', () => ({ lean: async () => [] }));
  t.mock.method(Companion, 'findOneAndUpdate', (query, update) => ({ lean: async () => {
    if (!matches(query)) return null;
    apply(update);
    return clone(stored);
  } }));
  const familyMatches = (query) => family
    && (!query.lockToken || family.lockToken === query.lockToken)
    && (!query.lockedUntil?.$lte || new Date(family.lockedUntil) <= query.lockedUntil.$lte)
    && (!query.lockedUntil?.$gt || new Date(family.lockedUntil) > query.lockedUntil.$gt);
  const applyFamily = (update) => { Object.assign(family, clone(update.$set || {})); for (const key of Object.keys(update.$unset || {})) delete family[key]; };
  t.mock.method(CompanionFamily, 'updateOne', async (query, update) => {
    if (update.$setOnInsert && !family) family = { _id: 'joe-and-focus', ...clone(update.$setOnInsert) };
    else if (familyMatches(query)) applyFamily(update);
    return { acknowledged: true, matchedCount: familyMatches(query) ? 1 : 0 };
  });
  t.mock.method(CompanionFamily, 'findOneAndUpdate', (query, update) => ({ lean: async () => {
    if (!familyMatches(query)) return null;
    applyFamily(update);
    return clone(family);
  } }));
  let serial = 0;
  const request = async (actor, action, values = {}) => {
    const response = { code: 200, body: undefined as ApiResponse<CompanionSnapshot>, set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await interactWithCompanion({ desktop: { profile: actor }, body: { action, operationId: `operation-${++serial}`, ...values } }, response);
    return response;
  };
  const adopt = await request('joe', 'adopt', { name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'curious' });
  assert.equal(adopt.code, 200, JSON.stringify(adopt.body));
  stored.portrait = { url: 'https://example.test/pixel.png', publicId: 'keep-me', createdAt: new Date() };
  const beforeAppearance = clone(stored);
  const appearance = { visualStyle: 'pixel', animated: false, usePortrait: false };
  const changedLook = await request('focus', 'appearance', { appearance });
  assert.equal(changedLook.code, 200);
  assert.deepEqual(changedLook.body.data.companion.appearance, appearance);
  assert.deepEqual(stored.portrait, beforeAppearance.portrait);
  assert.deepEqual(stored.memories, beforeAppearance.memories);
  assert.equal(stored.budget, undefined);
  const afterAppearance = clone(stored);
  for (const invalid of [{ ...appearance, visualStyle: 'html' }, { ...appearance, animated: 'false' }, { ...appearance, url: 'https://example.test' }, null]) {
    assert.equal((await request('joe', 'appearance', { appearance: invalid })).code, 400);
    assert.deepEqual(stored, afterAppearance);
  }
  assert.equal((await request('joe', 'appearance', { appearance: { visualStyle: 'soft', animated: true, usePortrait: true } })).code, 200);
  const beforeCustomize = clone(stored);
  const customization = { name: 'New Pip', form: 'creature', seed: 'A teal dragon', appearance: { visualStyle: 'pixel', animated: true, usePortrait: false, species: 'dragon', bodyColor: '#00aacc' }, expectedRevision: stored.revision };
  assert.equal((await request('focus', 'customize', customization)).code, 200);
  assert.equal(stored.name, 'New Pip');
  assert.deepEqual(stored.memories, beforeCustomize.memories);
  assert.equal(stored.xp, beforeCustomize.xp);
  assert.deepEqual(stored.portrait, beforeCustomize.portrait);
  assert.equal((await request('joe', 'customize', customization)).code, 409);
  assert.equal((await request('focus', 'adopt', { name: 'Other', form: 'pet', seed: 'A cat', temperament: 'playful' })).code, 409);
  const first = await request('joe', 'feed', { operationId: 'care-retry-123' });
  assert.equal(first.body.data.companion.bonds.joe, 1);
  const retry = await request('joe', 'feed', { operationId: 'care-retry-123' });
  assert.equal(retry.body.data.companion.bonds.joe, 1);
  assert.equal((await request('focus', 'play')).body.data.companion.bonds.focus, 1);

  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'fake-test-key';
  let finish;
  t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { finish = resolve; }));
  try {
    const chat = request('joe', 'chat', { text: 'My favorite color is teal.' });
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await request('focus', 'cuddle')).code, 409);
    finish({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"reply":"A teal adventure!","mood":"curious","thought":"A teal moon"}' }] } }] }) });
    const result = await chat;
    assert.equal(result.code, 200);
    assert.equal(result.body.data.companion.turns[0].actor, 'joe');
    assert.equal(family.budget.chats, 1);
    const memory = stored.memories.at(-1);
    await request('focus', 'forget', { memoryId: memory.id });
    assert.equal(stored.turns.length, 0);
    assert.equal(stored.memories.some((row) => row.id === memory.id), false);
    family.budget.lastChat = new Date(0);
    const xp = stored.xp;
    const failedOperationId = 'chat-provider-failure-retry';
    const failed = request('joe', 'chat', { operationId: failedOperationId, text: 'This should not be remembered on failure.' });
    finish = null;
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    finish({ ok: false, status: 429 });
    assert.equal((await failed).code, 429);
    assert.equal(stored.xp, xp);
    assert.equal(family.budget.chats, 2);
    assert.equal(stored.lockToken, undefined);
    assert.equal(family.recentOperations.includes(`chats:${failedOperationId}`), false);

    // The client intentionally keeps its operation ID after a lost/failed
    // response. A definite provider failure must not strand that retry at 409.
    family.budget.lastChat = new Date(0);
    const retried = request('joe', 'chat', { operationId: failedOperationId, text: 'This should not be remembered on failure.' });
    finish = null;
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    finish({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"reply":"I am back!","mood":"happy","thought":"A warm hello","growth":"none"}' }] } }] }) });
    assert.equal((await retried).code, 200);
    assert.equal(family.recentOperations.includes(`chats:${failedOperationId}`), true);
  } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});
