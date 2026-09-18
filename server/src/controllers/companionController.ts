import { randomUUID } from 'node:crypto';
import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import { evolveCompanion } from '../services/companionEvolution.js';
import { ACTIONS, COMPANION_FAMILY_ID, COMPANION_KEY, careFor, forgetMemory, initialCompanion, publicCompanion, remember, settledState, startingTraits, validateSetup, validateAppearance } from '../services/companionState.js';
import { ensureCompanionFamily, migrateCompanion, migrateCompanionRoster } from '../services/companionMigration.js';
import { chatWithCompanion, companionCapabilities } from '../services/companionBrain.js';
import type { StoredCompanion, CompanionBudget } from '../../../shared/contracts.js';

const ACTIVE_COMPANION_LIMIT = 6;
const OPERATION_ID = /^[a-zA-Z0-9-]{10,80}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });
const respond = (res, state) => res.json({ success: true, data: { companion: publicCompanion(state), capabilities: companionCapabilities() } });
const wrap = (handler) => async (req, res) => {
  try { await handler(req, res); }
  catch (error) { res.status(error.status || 500).json({ success: false, error: { code: 'COMPANION_ERROR', message: error.status ? error.message : 'Could not save your companion. Please try again.' } }); }
};

async function ensureLegacyCompanion() {
  try { await Companion.updateOne({ _id: COMPANION_KEY }, { $setOnInsert: { ...initialCompanion(), _id: COMPANION_KEY } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  await migrateCompanion(COMPANION_KEY);
}

async function withFamilyLock(change) {
  await ensureCompanionFamily();
  const token = randomUUID();
  const family = await CompanionFamily.findOneAndUpdate(
    { _id: COMPANION_FAMILY_ID, lockedUntil: { $lte: new Date() } },
    { $set: { lockToken: token, lockedUntil: new Date(Date.now() + 20000) } },
    { new: true }
  ).lean();
  if (!family) throw fail(409, 'Your companion family is busy. Please try again shortly.');
  try { return await change(family, token); }
  finally { await CompanionFamily.updateOne({ _id: COMPANION_FAMILY_ID, lockToken: token }, { $set: { lockedUntil: new Date(0) }, $unset: { lockToken: 1 } }).catch(() => {}); }
}

// A Mongo lease serializes both profiles and every server process. No long
// transaction is kept open while an external generation request runs.
export async function withCompanionLock(operationId: string, change: (state: StoredCompanion, token: string) => Promise<StoredCompanion>, companionId = COMPANION_KEY) {
  if (companionId === COMPANION_KEY) await ensureLegacyCompanion();
  else if (!await migrateCompanion(companionId)) throw fail(404, 'That companion could not be found.');
  const token = randomUUID();
  const state = await Companion.findOneAndUpdate(
    { _id: companionId, familyId: COMPANION_FAMILY_ID, lockedUntil: { $lte: new Date() } },
    { $set: { lockToken: token, lockedUntil: new Date(Date.now() + 180000) } }, { new: true }
  ).lean();
  if (!state) throw fail(409, 'Your companion is busy with another moment. Please try again shortly.');
  try {
    if (state.recentOperations?.includes(operationId)) return state;
    const changed = evolveCompanion(await change(state, token), state.xp);
    const { _id, __v, lockToken, lockedUntil, budget, ...fields } = changed;
    const saved = await Companion.findOneAndUpdate({ _id: companionId, lockToken: token }, {
      $set: { ...fields, updatedAt: new Date(), revision: state.revision + 1, recentOperations: [...(state.recentOperations || []), operationId].slice(-60) }
    }, { new: true, runValidators: true }).lean();
    if (!saved) throw fail(409, 'This moment expired before it could be saved. Please retry.');
    return saved;
  } finally {
    await Companion.updateOne({ _id: companionId, lockToken: token }, { $set: { lockedUntil: new Date(0) }, $unset: { lockToken: 1 } }).catch(() => {});
  }
}

export function nextBudget(current: Partial<CompanionBudget> | undefined, kind: 'chats' | 'portraits', now = new Date()): CompanionBudget {
  const day = now.toISOString().slice(0, 10);
  const budget = current?.day === day ? { chats: 0, portraits: 0, ...current, day } : { day, chats: 0, portraits: 0 };
  const last = kind === 'chats' ? 'lastChat' : 'lastPortrait';
  const cooldown = kind === 'chats' ? 5000 : 60000;
  if (budget[last] && now.getTime() - new Date(budget[last]).getTime() < cooldown) throw fail(429, 'Give your companion a moment before trying again.');
  if ((budget[kind] || 0) >= (kind === 'chats' ? 60 : 5)) throw fail(429, 'Today’s shared AI allowance is used up. Care and memories are still available.');
  return { ...budget, [kind]: (budget[kind] || 0) + 1, [last]: now };
}

async function reserveGeneration(operationId: string, kind: 'chats' | 'portraits') {
  await withFamilyLock(async (family, token) => {
    const reservationId = `${kind}:${operationId}`;
    if (family.recentOperations?.includes(reservationId)) return;
    const budget = nextBudget(family.budget, kind);
    const result = await CompanionFamily.updateOne(
      { _id: COMPANION_FAMILY_ID, lockToken: token },
      { $set: { budget, recentOperations: [...(family.recentOperations || []), reservationId].slice(-120) } }
    );
    if (!result.matchedCount) throw fail(409, 'The shared AI reservation expired. Please retry.');
  });
}

const validCompanionId = (value) => typeof value === 'string' && (value === COMPANION_KEY || /^companion-[a-f0-9-]{36}$/.test(value));
const validOperationId = (value) => typeof value === 'string' && OPERATION_ID.test(value);
const activeFilter = { familyId: COMPANION_FAMILY_ID, archivedAt: null, bornAt: { $ne: null } };

export const getCompanion = wrap(async (req, res) => {
  const companionId = req.query.id || COMPANION_KEY;
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  if (companionId === COMPANION_KEY) await ensureLegacyCompanion();
  const companion = await migrateCompanion(companionId);
  if (!companion) throw fail(404, 'That companion could not be found.');
  respond(res, companion);
});

export const getCompanionRoster = wrap(async (req, res) => {
  await ensureLegacyCompanion();
  await migrateCompanionRoster();
  const includeArchived = req.query.archived === 'true';
  const companions = await Companion.find({ familyId: COMPANION_FAMILY_ID, ...(includeArchived ? {} : { archivedAt: null }) }, { _id: 1, name: 1, bornAt: 1, archivedAt: 1, mood: 1, xp: 1, appearance: 1, form: 1, revision: 1 }).sort({ bornAt: 1 }).lean();
  res.json({ success: true, data: { companions: companions.map((companion) => ({ id: companion._id, name: companion.name, bornAt: companion.bornAt, archivedAt: companion.archivedAt, mood: companion.mood, level: Math.floor(companion.xp / 80) + 1, form: companion.form, appearance: companion.appearance, revision: companion.revision })), activeLimit: ACTIVE_COMPANION_LIMIT } });
});

export const createCompanion = wrap(async (req, res) => {
  if (!validateSetup(req.body)) throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  if (!validOperationId(req.body?.operationId)) throw fail(400, 'A valid operation ID is required.');
  const created = await withFamilyLock(async () => {
    await migrateCompanionRoster();
    const replay = await Companion.findOne({ familyId: COMPANION_FAMILY_ID, createdOperationId: req.body.operationId }).lean();
    if (replay) return replay;
    if (await Companion.countDocuments(activeFilter) >= ACTIVE_COMPANION_LIMIT) throw fail(409, 'Your companion family already has six active companions. Archive one before hatching another.');
    const id = `companion-${randomUUID()}`;
    const state = initialCompanion();
    state.name = req.body.name.trim(); state.form = req.body.form; state.seed = req.body.seed.trim();
    state.traits = startingTraits(req.body.temperament); state.appearance = req.body.appearance || state.appearance; state.bornAt = new Date();
    return (await Companion.create({ ...state, _id: id, createdOperationId: req.body.operationId })).toObject();
  });
  res.status(201).json({ success: true, data: { id: created._id, companion: publicCompanion(created) } });
});

export const interactWithCompanion = wrap(async (req, res) => {
  const { action, text, operationId, memoryId, expectedRevision, companionId = COMPANION_KEY } = req.body || {};
  const actor = req.desktop.profile;
  if (!validOperationId(operationId)) throw fail(400, 'A valid operation ID is required.');
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  if (!['adopt', 'customize', 'inspiration', 'chat', 'chatColor', 'appearance', 'portrait', 'forget', 'archive', 'restore', ...ACTIONS].includes(action)) throw fail(400, 'Choose a supported companion action.');
  if (action === 'customize' && (!validateSetup({ ...req.body, temperament: 'curious' }) || !validateAppearance(req.body.appearance))) throw fail(400, 'Choose a valid name, description, form, and appearance.');
  if (action === 'appearance' && !validateAppearance(req.body.appearance)) throw fail(400, 'Choose soft or pixel art and valid animation settings.');
  if (action === 'adopt' && !validateSetup(req.body)) throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  if (action === 'inspiration' && (typeof text !== 'string' || text.length > 300)) throw fail(400, 'Your inspiration can be up to 300 characters.');
  if (action === 'chat' && (typeof text !== 'string' || !text.trim() || text.trim().length > 1000)) throw fail(400, 'Write a message between 1 and 1,000 characters.');
  if (action === 'chatColor' && (typeof req.body?.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(req.body.color))) throw fail(400, 'Choose a valid companion chat color.');
  if (action === 'chat' && !companionCapabilities().chat) throw fail(503, 'Gemini chat is not connected yet. Add GEMINI_API_KEY on the server.');
  if (action === 'portrait') throw fail(410, 'Portrait generation has been retired. Your companion now grows through built-in animated forms.');
  if (action === 'forget' && (typeof memoryId !== 'string' || memoryId.length > 80)) throw fail(400, 'Choose a valid memory.');
  const saved = await withCompanionLock(operationId, async (state) => {
    let next = settledState(state);
    if (action === 'adopt') {
      if (state.bornAt) throw fail(409, 'Your shared companion has already hatched. Reopen the widget to meet them.');
      return { ...next, name: req.body.name.trim(), form: req.body.form, seed: req.body.seed.trim(), traits: startingTraits(req.body.temperament), appearance: req.body.appearance || next.appearance, bornAt: new Date() };
    }
    if (!state.bornAt) throw fail(409, 'Hatch your shared companion first.');
    if (state.archivedAt && action !== 'restore') throw fail(409, 'Restore this companion before sharing another moment.');
    if (action === 'archive') return { ...next, archivedAt: new Date() };
    if (action === 'restore') {
      if (!state.archivedAt) return next;
      await withFamilyLock(async () => {
        await migrateCompanionRoster();
        if (await Companion.countDocuments(activeFilter) >= ACTIVE_COMPANION_LIMIT) throw fail(409, 'Your companion family already has six active companions. Archive one before restoring another.');
      });
      return { ...next, archivedAt: null };
    }
    if (action === 'customize') {
      if (expectedRevision !== state.revision) throw fail(409, 'Your companion changed while you were editing. Refresh and try again.');
      return { ...next, name: req.body.name.trim(), form: req.body.form, seed: req.body.seed.trim(), appearance: req.body.appearance };
    }
    if (action === 'appearance') return { ...next, appearance: req.body.appearance };
    if (action === 'chatColor') return { ...next, chatColor: req.body.color };
    if (action === 'inspiration') {
      if (expectedRevision !== state.revision) throw fail(409, 'Your companion changed while you were editing. Refresh and try again.');
      return { ...next, inspirations: { ...state.inspirations, [actor]: text.trim() } };
    }
    if (action === 'forget') {
      if (!state.memories.some((memory) => memory.id === memoryId)) throw fail(404, 'That memory is already gone.');
      return forgetMemory(next, memoryId);
    }
    if (ACTIONS.includes(action)) {
      if (state.lastCare?.[actor] && Date.now() - new Date(state.lastCare[actor]).getTime() < 5000) throw fail(429, 'Let your companion enjoy this moment. Try again in a few seconds.');
      return { ...careFor(state, actor, action), lastCare: { ...state.lastCare, [actor]: new Date() } };
    }
    if (action === 'chat') {
      await reserveGeneration(operationId, 'chats');
      const reply = await chatWithCompanion(next, actor, text.trim());
      const id = randomUUID();
      next = remember(next, actor, 'conversation', text.trim(), new Date(), id);
      return { ...next, mood: reply.mood, thought: reply.thought, xp: next.xp + 4,
        traits: { ...next.traits, [reply.growth || 'curiosity']: Math.min(100, next.traits[reply.growth || 'curiosity'] + 1) },
        turns: [...state.turns, { id, actor, text: text.trim(), at: new Date() }, { id, actor: 'companion', text: reply.reply, at: new Date() }].slice(-60) };
    }
    throw fail(400, 'Choose a supported companion action.');
  }, companionId);
  respond(res, saved);
});
