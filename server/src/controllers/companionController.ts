import { randomUUID } from 'node:crypto';
import Companion from '../models/Companion.js';
import { ACTIONS, COMPANION_KEY, careFor, forgetMemory, initialCompanion, publicCompanion, remember, settledState, startingTraits, validateSetup } from '../services/companionState.js';
import { chatWithCompanion, companionCapabilities, generatePortrait, removePortrait } from '../services/companionBrain.js';
import type { StoredCompanion, CompanionBudget, CompanionPortrait } from '../../../shared/contracts.js';

const fail = (status, message) => Object.assign(new Error(message), { status });
const respond = (res, state) => res.json({ success: true, data: { companion: publicCompanion(state), capabilities: companionCapabilities() } });
const wrap = (handler) => async (req, res) => {
  try { await handler(req, res); }
  catch (error) { res.status(error.status || 500).json({ success: false, error: { code: 'COMPANION_ERROR', message: error.status ? error.message : 'Could not save your companion. Please try again.' } }); }
};

async function ensureCompanion() {
  try { await Companion.updateOne({ _id: COMPANION_KEY }, { $setOnInsert: initialCompanion() }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
}

// A Mongo lease serializes both profiles and every server process. No long
// transaction is kept open while an external generation request runs.
export async function withCompanionLock(operationId: string, change: (state: StoredCompanion, token: string) => Promise<StoredCompanion>) {
  await ensureCompanion();
  const token = randomUUID();
  const state = await Companion.findOneAndUpdate(
    { _id: COMPANION_KEY, lockedUntil: { $lte: new Date() } },
    { $set: { lockToken: token, lockedUntil: new Date(Date.now() + 180000) } }, { new: true }
  ).lean();
  if (!state) throw fail(409, 'Your companion is busy with another moment. Please try again shortly.');
  try {
    if (state.recentOperations?.includes(operationId)) return state;
    const changed = await change(state, token);
    const { _id, __v, lockToken, lockedUntil, budget, ...fields } = changed;
    const saved = await Companion.findOneAndUpdate({ _id: COMPANION_KEY, lockToken: token }, {
      $set: { ...fields, updatedAt: new Date(), revision: state.revision + 1, recentOperations: [...(state.recentOperations || []), operationId].slice(-60) }
    }, { new: true, runValidators: true }).lean();
    if (!saved) throw fail(409, 'This moment expired before it could be saved. Please retry.');
    return saved;
  } finally {
    await Companion.updateOne({ _id: COMPANION_KEY, lockToken: token }, { $set: { lockedUntil: new Date(0) }, $unset: { lockToken: 1 } }).catch(() => {});
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

async function reserveGeneration(state, token, kind) {
  const budget = nextBudget(state.budget, kind);
  await Companion.updateOne({ _id: COMPANION_KEY, lockToken: token }, { $set: { budget } });
}

export const getCompanion = wrap(async (_req, res) => {
  respond(res, await Companion.findById(COMPANION_KEY).lean() || initialCompanion());
});

export const interactWithCompanion = wrap(async (req, res) => {
  const { action, text, operationId, memoryId, expectedRevision } = req.body || {};
  const actor = req.desktop.profile;
  if (typeof operationId !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(operationId)) throw fail(400, 'A valid operation ID is required.');
  if (!['adopt', 'inspiration', 'chat', 'chatColor', 'portrait', 'forget', ...ACTIONS].includes(action)) throw fail(400, 'Choose a supported companion action.');
  if (action === 'adopt' && !validateSetup(req.body)) throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  if (action === 'inspiration' && (typeof text !== 'string' || text.length > 300)) throw fail(400, 'Your inspiration can be up to 300 characters.');
  if (action === 'chat' && (typeof text !== 'string' || !text.trim() || text.trim().length > 1000)) throw fail(400, 'Write a message between 1 and 1,000 characters.');
  if (action === 'chatColor' && (typeof req.body?.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(req.body.color))) throw fail(400, 'Choose a valid companion chat color.');
  if (action === 'chat' && !companionCapabilities().chat) throw fail(503, 'Gemini chat is not connected yet. Add GEMINI_API_KEY on the server.');
  if (action === 'portrait' && !companionCapabilities().portraits) throw fail(503, 'Portraits need Gemini and Cloudinary configured on the server.');
  if (action === 'forget' && (typeof memoryId !== 'string' || memoryId.length > 80)) throw fail(400, 'Choose a valid memory.');
  let newPortrait;
  let oldPortrait;
  let saved;
  try {
    saved = await withCompanionLock(operationId, async (state, token) => {
      let next = settledState(state);
      if (action === 'adopt') {
        if (state.bornAt) throw fail(409, 'Your shared companion has already hatched. Reopen the widget to meet them.');
        return { ...next, name: req.body.name.trim(), form: req.body.form, seed: req.body.seed.trim(), traits: startingTraits(req.body.temperament), bornAt: new Date() };
      }
      if (!state.bornAt) throw fail(409, 'Hatch your shared companion first.');
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
        return { ...careFor(next, actor, action), lastCare: { ...state.lastCare, [actor]: new Date() } };
      }
      if (action === 'chat') {
        await reserveGeneration(state, token, 'chats');
        const reply = await chatWithCompanion(next, actor, text.trim());
        const id = randomUUID();
        next = remember(next, actor, 'conversation', text.trim(), new Date(), id);
        return { ...next, mood: reply.mood, thought: reply.thought, xp: next.xp + 4,
          traits: { ...next.traits, curiosity: Math.min(100, next.traits.curiosity + 1) },
          turns: [...state.turns, { id, actor, text: text.trim(), at: new Date() }, { id, actor: 'companion', text: reply.reply, at: new Date() }].slice(-60) };
      }
      await reserveGeneration(state, token, 'portraits');
      newPortrait = await generatePortrait(next);
      oldPortrait = state.portrait;
      return { ...next, portrait: newPortrait };
    });
  } catch (error) {
    if (newPortrait) await removePortrait(newPortrait);
    throw error;
  }
  if (newPortrait) await removePortrait(oldPortrait);
  respond(res, saved);
});
