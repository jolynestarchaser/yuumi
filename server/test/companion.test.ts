import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Profile, Temperament, ApiResponse, CompanionSnapshot } from '../../shared/contracts.js';
import type { AddressInfo } from 'node:net';
import Companion from '../src/models/Companion.js';
import companionRoutes from '../src/routes/companions.js';
import { interactWithCompanion, nextBudget } from '../src/controllers/companionController.js';
import { brainContext, generateContent, parseBrainReply } from '../src/services/companionBrain.js';
import { careFor, forgetMemory, initialCompanion, publicCompanion, remember, settledState, startingTraits, validateSetup } from '../src/services/companionState.js';

test('time away preserves safe needs and relationships; repeated reads do not compound decay', () => {
  const state = { ...initialCompanion(), updatedAt: new Date('2026-01-01'), bonds: { joe: 7, focus: 5 } };
  const later = new Date('2027-01-01');
  assert.deepEqual(settledState(state, later), settledState(state, later));
  assert.deepEqual(settledState(state, later).needs, { fullness: 20, energy: 100, joy: 35 });
  assert.deepEqual(settledState(state, later).bonds, state.bonds);
  assert.equal(state.needs.fullness, 75);
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

test('character creation validates its fields and seeds personality from the chosen temperament', () => {
  assert.equal(validateSetup({ name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'gentle' }), true);
  assert.equal(validateSetup({ name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'evil' as Temperament }), false);
  assert.equal(validateSetup({ name: ' '.repeat(4), form: 'creature', seed: 'Teal dragon', temperament: 'curious' }), false);
  assert.equal(startingTraits('gentle').affection, 65);
});

test('public state omits leases, retry IDs, and usage metadata', () => {
  const output = publicCompanion({ ...initialCompanion(), lockToken: 'private', budget: { day: '2026-09-17', chats: 3, portraits: 0 }, lastCare: {}, recentOperations: ['private'], lockedUntil: new Date() });
  for (const key of ['lockToken', 'budget', 'lastCare', 'recentOperations', 'lockedUntil']) assert.equal(key in output, false);
});

test('legacy companions use the authored soft form when appearance settings are absent', () => {
  const legacy = initialCompanion();
  delete legacy.appearance;
  assert.deepEqual(publicCompanion(legacy).appearance, { visualStyle: 'soft', animated: true, usePortrait: false });
  legacy.portrait = { url: 'https://example.test/pixel.png', publicId: 'original', createdAt: new Date() };
  assert.deepEqual(publicCompanion(legacy).appearance, { visualStyle: 'soft', animated: true, usePortrait: false });
  assert.equal(legacy.appearance, undefined);
});

test('public companion derives a visible evolution form from level and care path', () => {
  const state = initialCompanion();
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
    } }), (error) => error instanceof Error && 'status' in error && error.status === 502 && !error.message.includes('fake-test-key'));
  } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});

test('companion routes reject unauthenticated callers without reaching MongoDB', async () => {
  const app = express();
  app.use('/api/companions', companionRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.on('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/companions`);
    assert.equal(response.status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

// Exercise the real controller and brain adapter against an atomic in-memory
// model, with provider responses mocked. No database or paid calls are used.
test('shared actions serialize both caregivers, deduplicate retries, and preserve state on provider failure', async (t) => {
  let stored;
  const clone = (value) => structuredClone(value);
  const matches = (query) => stored && (!query.lockToken || stored.lockToken === query.lockToken) && (!query.lockedUntil || new Date(stored.lockedUntil) <= query.lockedUntil.$lte);
  const apply = (update) => { Object.assign(stored, clone(update.$set || {})); for (const key of Object.keys(update.$unset || {})) delete stored[key]; };
  t.mock.method(Companion, 'updateOne', async (query, update) => {
    if (update.$setOnInsert && !stored) stored = { _id: 'joe-and-focus', ...clone(update.$setOnInsert), lockedUntil: new Date(0), recentOperations: [] };
    else if (matches(query)) apply(update);
    return { acknowledged: true };
  });
  t.mock.method(Companion, 'findOneAndUpdate', (query, update) => ({ lean: async () => {
    if (!matches(query)) return null;
    apply(update);
    return clone(stored);
  } }));
  let serial = 0;
  const request = async (actor, action, values = {}) => {
    const response = { code: 200, body: undefined as ApiResponse<CompanionSnapshot>, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await interactWithCompanion({ desktop: { profile: actor }, body: { action, operationId: `operation-${++serial}`, ...values } }, response);
    return response;
  };
  const adopt = await request('joe', 'adopt', { name: 'Pip', form: 'creature', seed: 'Teal dragon', temperament: 'curious' });
  assert.equal(adopt.code, 200);
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
  const first = await request('joe', 'feed', { operationId: 'care-retry-123', actor: 'focus' });
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
    assert.equal(stored.budget.chats, 1);
    const memory = stored.memories.at(-1);
    await request('focus', 'forget', { memoryId: memory.id });
    assert.equal(stored.turns.length, 0);
    assert.equal(stored.memories.some((row) => row.id === memory.id), false);
    stored.budget.lastChat = new Date(0);
    const xp = stored.xp;
    const failed = request('joe', 'chat', { text: 'This should not be remembered on failure.' });
    finish = null;
    while (!finish) await new Promise((resolve) => setImmediate(resolve));
    finish({ ok: false, status: 429 });
    assert.equal((await failed).code, 429);
    assert.equal(stored.xp, xp);
    assert.equal(stored.budget.chats, 2);
    assert.equal(stored.lockToken, undefined);
  } finally { if (previous === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previous; }
});
