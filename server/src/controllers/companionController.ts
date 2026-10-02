import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import CompanionOperationReceipt from '../models/CompanionOperationReceipt.js';
import { evolveCompanion } from '../services/companionEvolution.js';
import { COMPANION_FAMILY_ID, COMPANION_KEY, careFor, displayName, forgetMemory, initialCompanion, publicCompanion, refreshCareRequest, remember, settledState, startingTraits, validateSetup, validateAppearance } from '../services/companionState.js';
import { ensureCompanionFamily, migrateCompanion, migrateCompanionRoster } from '../services/companionMigration.js';
import { chatWithCompanion, companionCapabilities } from '../services/companionBrain.js';
import { engageCompanion } from '../services/companionSimulation.js';
import { applyLifecycleCare, addXp } from '../services/companionRewards.js';
import { retireCompanion } from '../services/companionLifecycle.js';
import { completeDailyRitual, currentDailyRitual } from '../services/companionRitual.js';
import { assertReceiptPayload, mutationIdentity } from '../services/companionMutation.js';
import { initializePetProgression } from '../services/petProgression.js';
import { grantTutorial, rewardPetAction } from '../services/petCare.js';
import { petLevel } from '../services/petCatalog.js';
import { applyPetCare, choosePetPrompt, completePetActivityStep, settlePetRest, startPetActivity } from '../services/petActions.js';
import { fallbackPetReply, validatePetReplyAbilities } from '../services/petDialogue.js';
import { petGameplayEnabled } from '../services/petRollout.js';
import { persistPetGrowth, readPetHistory } from '../services/petGrowthHistory.js';
import { enrollPetForms } from '../services/petProgressionMigration.js';
import type { StoredCompanion, CompanionBudget, Profile } from '../../../shared/contracts.js';

const ACTIVE_COMPANION_LIMIT = 6;
const LIFECYCLE_ACTIONS = ['feed', 'play', 'cuddle', 'rest', 'explore', 'clean', 'medicine'];
const OPERATION_ID = /^[a-zA-Z0-9-]{10,80}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });
const privateNoStore = (res) => res.set('Cache-Control', 'private, no-store');
const respond = async (res, state: StoredCompanion) => {
  const companion = publicCompanion(state);
  if (companion.growth && state.progression?.historyStored) {
    const pending = await readPetHistory(state.familyId, String(state._id), true);
    companion.growth.pendingPresentationIds = pending.events.map((event) => event.growthEventId);
    companion.growth.pendingCursor = pending.nextCursor;
    const history = await readPetHistory(state.familyId, String(state._id), false, undefined, 100);
    companion.growth.history = history.events.reverse();
    companion.growth.historyCursor = history.nextCursor;
  }
  return privateNoStore(res).json({ success: true, data: { companion, capabilities: companionCapabilities() } });
};
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
export async function withCompanionLock(operationId: string, change: (state: StoredCompanion, token: string) => Promise<StoredCompanion>, companionId = COMPANION_KEY, context?: { actor: Profile | 'system'; payload: unknown; familyToken?: string }) {
  if (companionId === COMPANION_KEY) await ensureLegacyCompanion();
  else if (!await migrateCompanion(companionId)) throw fail(404, 'That companion could not be found.');
  const identity = context ? mutationIdentity(COMPANION_FAMILY_ID, companionId, operationId, context.actor, context.payload) : null;
  if (identity) {
    const receipt = await CompanionOperationReceipt.findOne({ familyId: identity.familyId, companionId: identity.companionId, operationId }).lean();
    if (receipt) {
      assertReceiptPayload(receipt, identity);
      const replay = await Companion.findById(receipt.outcomeCompanionId).lean();
      if (replay) return replay;
    }
  }
  const token = randomUUID();
  const state = await Companion.findOneAndUpdate(
    { _id: companionId, familyId: COMPANION_FAMILY_ID, lockedUntil: { $lte: new Date() } },
    { $set: { lockToken: token, lockedUntil: new Date(Date.now() + 180000) } }, { new: true }
  ).lean();
  if (!state) throw fail(409, 'Your companion is busy with another moment. Please try again shortly.');
  try {
    if (state.recentOperations?.includes(operationId)) return state;
    // Enrollment captures the baseline before this command awards any new XP.
    const commandState = state.progression && petGameplayEnabled() ? enrollPetForms(state) : state;
    const mutated = refreshCareRequest(await change(commandState, token));
    // XP forms are independent of age/lifecycle. This runs inside the same
    // leased receipt mutation, so a replay sees the stored choice and cannot reroll.
    const changed = mutated.progression && !petGameplayEnabled() ? mutated : evolveCompanion(mutated, state.xp);
    let saved: StoredCompanion | null = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (context?.familyToken) {
          const familyLease = await CompanionFamily.updateOne({ _id: COMPANION_FAMILY_ID, lockToken: context.familyToken, lockedUntil: { $gt: new Date() } }, { $set: { lockToken: context.familyToken } }, { session });
          if (!familyLease.matchedCount) throw fail(409, 'The companion family lease expired. Please retry.');
        }
        if (identity) {
          const receipt = await CompanionOperationReceipt.findOne({ familyId: identity.familyId, companionId: identity.companionId, operationId }).session(session).lean();
          if (receipt) {
            assertReceiptPayload(receipt, identity);
            saved = await Companion.findById(receipt.outcomeCompanionId).session(session).lean();
            return;
          }
        }
        const payload = context?.payload as { action?: string; eventIds?: string[] } | undefined;
        const persisted = await persistPetGrowth(changed, session, payload?.action === 'growthAck' ? payload.eventIds : []);
        const { _id, __v, lockToken, lockedUntil, budget, pendingChat, ...fields } = persisted;
        saved = await Companion.findOneAndUpdate({ _id: companionId, lockToken: token, lockedUntil: { $gt: new Date() } }, {
          $set: { ...fields, updatedAt: new Date(), revision: state.revision + 1, recentOperations: [...(state.recentOperations || []), operationId].slice(-60) }
        }, { new: true, runValidators: true, session }).lean();
        if (!saved) throw fail(409, 'This moment expired before it could be saved. Please retry.');
        if (identity) await CompanionOperationReceipt.create([{ ...identity, outcomeCompanionId: companionId, outcomeRevision: saved.revision }], { session });
      });
    } finally { await session.endSession(); }
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
    if (family.recentOperations?.includes(reservationId)) throw fail(409, 'This AI attempt is already reserved. Start a new attempt only after confirming its result.');
    const budget = nextBudget(family.budget, kind);
    const result = await CompanionFamily.updateOne(
      { _id: COMPANION_FAMILY_ID, lockToken: token },
      { $set: { budget, recentOperations: [...(family.recentOperations || []), reservationId].slice(-120) } }
    );
    if (!result.matchedCount) throw fail(409, 'The shared AI reservation expired. Please retry.');
  });
}

// A reservation prevents two live requests with the same operation ID from
// reaching the provider. It is intentionally retained after a successful
// mutation (the operation receipt replays that result), but must be removed
// when the provider/mutation fails before a receipt exists. Without this,
// one malformed or failed Gemini response permanently strands the client's
// retry ID behind a 409.
async function releaseGeneration(operationId: string, kind: 'chats' | 'portraits') {
  const reservationId = `${kind}:${operationId}`;
  await withFamilyLock(async (family, token) => {
    if (!family.recentOperations?.includes(reservationId)) return;
    const result = await CompanionFamily.updateOne(
      { _id: COMPANION_FAMILY_ID, lockToken: token },
      { $set: { recentOperations: family.recentOperations.filter((entry) => entry !== reservationId) } }
    );
    if (!result.matchedCount) throw fail(409, 'The shared AI reservation expired. Please retry.');
  });
}

const validCompanionId = (value) => typeof value === 'string' && (value === COMPANION_KEY || /^companion-[a-f0-9-]{36}$/.test(value));
const validOperationId = (value) => typeof value === 'string' && OPERATION_ID.test(value);
const activeFilter = { familyId: COMPANION_FAMILY_ID, archivedAt: null, bornAt: { $ne: null }, $or: [{ 'lifecycle.lifeStatus': 'alive' }, { lifecycle: { $exists: false } }] };

async function persistLifecycleTransition(state: StoredCompanion, now = new Date()): Promise<StoredCompanion> {
  if (!state.lifecycle || state.archivedAt || state.lifecycle.lifeStatus !== 'alive') return state;
  const settled = settledState(state, now);
  const transitioned = settled.lifecycle?.lifeStatus !== state.lifecycle.lifeStatus
    || settled.lifecycle?.healthCondition !== state.lifecycle.healthCondition
    || settled.lifecycle?.stage !== state.lifecycle.stage
    || (settled.lifecycleEvents?.length || 0) !== (state.lifecycleEvents?.length || 0);
  if (!transitioned) return state;
  const saved = await Companion.findOneAndUpdate(
    { _id: state._id, revision: state.revision, lockedUntil: { $lte: now } },
    { $set: { needs: settled.needs, lifecycle: settled.lifecycle, lifecycleEvents: settled.lifecycleEvents || [], stageOutcomes: settled.stageOutcomes || [], behaviorState: settled.behaviorState, restUntil: settled.restUntil, updatedAt: now, revision: state.revision + 1 } },
    { new: true, runValidators: true }
  ).lean();
  return saved || await Companion.findById(state._id).lean() || state;
}

export const getCompanion = wrap(async (req, res) => {
  const companionId = req.query.id || COMPANION_KEY;
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  if (companionId === COMPANION_KEY) await ensureLegacyCompanion();
  let companion = await migrateCompanion(companionId);
  if (!companion || companion.familyId !== COMPANION_FAMILY_ID) throw fail(404, 'That companion could not be found.');
  companion = await persistLifecycleTransition(companion);
  await respond(res, companion);
});

export const getCompanionRitualNotice = wrap(async (req, res) => {
  const companionId = req.query.id || COMPANION_KEY;
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  if (companionId === COMPANION_KEY) await ensureLegacyCompanion();
  let companion = await migrateCompanion(companionId);
  if (!companion || companion.familyId !== COMPANION_FAMILY_ID) throw fail(404, 'That companion could not be found.');
  companion = await persistLifecycleTransition(companion);
  const now = new Date();
  privateNoStore(res).json({ success: true, data: { companionId, name: companion.name, ritual: currentDailyRitual(settledState(companion, now), now) } });
});

export const getCompanionHistory = wrap(async (req, res) => {
  const companionId = req.query.id || COMPANION_KEY;
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  const state = await Companion.findOne({ _id: companionId, familyId: COMPANION_FAMILY_ID }).lean();
  if (!state) throw fail(404, 'That companion could not be found.');
  const pending = req.path.endsWith('/pending');
  if (req.query.cursor !== undefined && typeof req.query.cursor !== 'string') throw fail(400, 'Choose a valid cursor.');
  // Reads never run enrollment or history migration.
  if (state.progression && !state.progression.historyStored) {
    const limit = req.query.limit === undefined ? 25 : Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || req.query.cursor !== undefined) throw fail(400, 'Use a page size of 1–100; save a command before paging legacy history.');
    const events = [...state.progression.events].filter((event) => !pending || !event.acknowledgedAt).sort((a, b) => pending ? a.presentationSequence - b.presentationSequence : b.presentationSequence - a.presentationSequence);
    privateNoStore(res).json({ success: true, data: { events: events.slice(0, limit), nextCursor: null, migrationPending: true } }); return;
  }
  const page = await readPetHistory(COMPANION_FAMILY_ID, companionId, pending, req.query.cursor, req.query.limit);
  privateNoStore(res).json({ success: true, data: page });
});

export const getCompanionRoster = wrap(async (req, res) => {
  await ensureLegacyCompanion();
  await migrateCompanionRoster();
  const includeArchived = req.query.archived === 'true';
  const companions = await Companion.find({ familyId: COMPANION_FAMILY_ID, ...(includeArchived ? {} : { archivedAt: null }) }, { _id: 1, name: 1, bornAt: 1, archivedAt: 1, mood: 1, xp: 1, appearance: 1, form: 1, revision: 1, 'progression.legacyLevel': 1 }).sort({ bornAt: 1 }).lean();
  privateNoStore(res).json({ success: true, data: { companions: companions.map((companion) => ({ id: companion._id, name: companion.name, bornAt: companion.bornAt, archivedAt: companion.archivedAt, mood: companion.mood, level: companion.progression ? petLevel(companion.xp, companion.progression.legacyLevel) : Math.floor(companion.xp / 80) + 1, form: companion.form, appearance: companion.appearance, revision: companion.revision })), activeLimit: ACTIVE_COMPANION_LIMIT } });
});

export const createCompanion = wrap(async (req, res) => {
  if (!validateSetup(req.body)) throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  if (!validOperationId(req.body?.operationId)) throw fail(400, 'A valid operation ID is required.');
  if (req.body.predecessorId !== undefined && !validCompanionId(req.body.predecessorId)) throw fail(400, 'Choose a valid predecessor.');
  const actor = req.desktop.profile as Profile;
  const identity = mutationIdentity(COMPANION_FAMILY_ID, 'roster', req.body.operationId, actor, req.body);
  const priorReceipt = await CompanionOperationReceipt.findOne({ familyId: COMPANION_FAMILY_ID, companionId: 'roster', operationId: req.body.operationId }).lean();
  if (priorReceipt) {
    assertReceiptPayload(priorReceipt, identity);
    const replay = await Companion.findById(priorReceipt.outcomeCompanionId).lean();
    if (replay) return res.status(201).json({ success: true, data: { id: replay._id, companion: publicCompanion(replay) } });
  }
  const created = await withFamilyLock(async (_family, token) => {
    await migrateCompanionRoster();
    const session = await mongoose.startSession();
    let result: StoredCompanion | null = null;
    try {
      await session.withTransaction(async () => {
        const familyLease = await CompanionFamily.updateOne({ _id: COMPANION_FAMILY_ID, lockToken: token, lockedUntil: { $gt: new Date() } }, { $set: { lockToken: token } }, { session });
        if (!familyLease.matchedCount) throw fail(409, 'The companion family lease expired. Please retry.');
        const receipt = await CompanionOperationReceipt.findOne({ familyId: COMPANION_FAMILY_ID, companionId: 'roster', operationId: req.body.operationId }).session(session).lean();
        if (receipt) {
          assertReceiptPayload(receipt, identity);
          result = await Companion.findById(receipt.outcomeCompanionId).session(session).lean();
          return;
        }
        const replay = await Companion.findOne({ familyId: COMPANION_FAMILY_ID, createdOperationId: req.body.operationId }).session(session).lean();
        if (replay) {
          result = replay;
          await CompanionOperationReceipt.create([{ ...identity, outcomeCompanionId: replay._id, outcomeRevision: replay.revision }], { session });
          return;
        }
        if (await Companion.countDocuments(activeFilter).session(session) >= ACTIVE_COMPANION_LIMIT) throw fail(409, 'Your companion family already has six active companions. Archive one before hatching another.');
        const id = `companion-${randomUUID()}`;
        const state = initialCompanion();
        if (req.body.predecessorId !== undefined) {
          if (!validCompanionId(req.body.predecessorId)) throw fail(400, 'Choose a valid predecessor.');
          const predecessor = await Companion.findById(req.body.predecessorId).session(session).lean();
          if (!predecessor || predecessor.familyId !== COMPANION_FAMILY_ID) throw fail(404, 'That predecessor could not be found.');
          if (!predecessor.lifecycle || predecessor.lifecycle.lifeStatus === 'alive') throw fail(409, 'A successor is available only after retirement or death.');
          const existing = await Companion.findOne({ familyId: COMPANION_FAMILY_ID, 'lifecycle.predecessorId': req.body.predecessorId }).session(session).lean();
          if (existing) {
            result = existing;
            await CompanionOperationReceipt.create([{ ...identity, outcomeCompanionId: existing._id, outcomeRevision: existing.revision }], { session });
            return;
          }
          state.lifecycle = { ...state.lifecycle!, lineageId: predecessor.lifecycle.lineageId, generation: predecessor.lifecycle.generation + 1, predecessorId: req.body.predecessorId };
        }
        state.name = req.body.name.trim(); state.form = req.body.form; state.seed = req.body.seed.trim();
        state.traits = startingTraits(req.body.temperament); state.appearance = req.body.appearance || state.appearance; state.bornAt = new Date();
        const initialized = petGameplayEnabled() ? grantTutorial(initializePetProgression({ ...state, _id: id }, new Date()), new Date()) : { ...state, _id: id };
        const rows = await Companion.create([{ ...evolveCompanion(initialized, 0), createdOperationId: req.body.operationId }], { session });
        const createdRow = rows[0].toObject();
        result = createdRow;
        await CompanionOperationReceipt.create([{ ...identity, outcomeCompanionId: id, outcomeRevision: createdRow.revision }], { session });
      });
    } finally { await session.endSession(); }
    if (!result) throw fail(409, 'The companion could not be created. Please retry.');
    return result;
  });
  res.status(201).json({ success: true, data: { id: created._id, companion: publicCompanion(created) } });
});

export const interactWithCompanion = wrap(async (req, res) => {
  const { action, text, operationId, memoryId, expectedRevision, companionId = COMPANION_KEY, language } = req.body || {};
  const actor = req.desktop.profile;
  if (!validOperationId(operationId)) throw fail(400, 'A valid operation ID is required.');
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  if (!['adopt', 'customize', 'inspiration', 'chat', 'chatColor', 'appearance', 'portrait', 'forget', 'archive', 'restore', 'visit', 'retire', 'growthAck', 'morphPreference', 'promptChoice', 'startActivity', 'activityStep', ...LIFECYCLE_ACTIONS].includes(action)) throw fail(400, 'Choose a supported companion action.');
  if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw fail(400, 'A valid companion revision is required.');
  if (action === 'growthAck' && (!Array.isArray(req.body.eventIds) || req.body.eventIds.length > 40 || req.body.eventIds.some((id) => typeof id !== 'string' || id.length > 150))) throw fail(400, 'Choose valid growth events.');
  if (action === 'morphPreference' && !['gentle', 'adventurous'].includes(req.body.preference)) throw fail(400, 'Choose a supported growth preference.');
  if (action === 'promptChoice' && !['company', 'nature', 'quiet'].includes(req.body.choice)) throw fail(400, 'Choose a supported conversation prompt.');
  if (action === 'startActivity' && (!['rhythm', 'find', 'explore'].includes(req.body.family) || req.body.capability !== undefined && !['greeting', 'grasp', 'float', 'sense', 'water'].includes(req.body.capability))) throw fail(400, 'Choose a supported activity.');
  if (action === 'activityStep' && (typeof req.body.sessionId !== 'string' || req.body.sessionId.length > 80 || !Number.isInteger(req.body.answer) || req.body.answer < 0 || req.body.answer > 2)) throw fail(400, 'Choose a valid activity step.');
  if (action === 'customize' && (!validateSetup({ ...req.body, temperament: 'curious' }) || !validateAppearance(req.body.appearance))) throw fail(400, 'Choose a valid name, description, form, and appearance.');
  if (action === 'appearance' && !validateAppearance(req.body.appearance)) throw fail(400, 'Choose soft or pixel art and valid animation settings.');
  if (action === 'adopt' && !validateSetup(req.body)) throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  if (action === 'inspiration' && (typeof text !== 'string' || text.length > 300)) throw fail(400, 'Your inspiration can be up to 300 characters.');
  if (action === 'chat' && (typeof text !== 'string' || !text.trim() || text.trim().length > 1000)) throw fail(400, 'Write a message between 1 and 1,000 characters.');
  if (action === 'chat' && language !== undefined && !['th', 'en'].includes(language)) throw fail(400, 'Choose a supported chat language.');
  if (action === 'chatColor' && (typeof req.body?.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(req.body.color))) throw fail(400, 'Choose a valid companion chat color.');
  if (action === 'portrait') throw fail(410, 'Portrait generation has been retired. Your companion now grows through built-in animated forms.');
  if (action === 'forget' && (typeof memoryId !== 'string' || memoryId.length > 80)) throw fail(400, 'Choose a valid memory.');
  if (action === 'retire' && !Number.isSafeInteger(expectedRevision)) throw fail(400, 'A valid companion revision is required.');
  let generationReserved = false;
  let preparedReply: Awaited<ReturnType<typeof chatWithCompanion>> | null = null;
  let chatToken: string | null = null;
  if (action === 'chat') {
    const identity = mutationIdentity(COMPANION_FAMILY_ID, companionId, operationId, actor, req.body);
    const receipt = await CompanionOperationReceipt.findOne({ familyId: COMPANION_FAMILY_ID, companionId, operationId }).lean();
    if (receipt) assertReceiptPayload(receipt, identity);
    else {
      const candidate = await migrateCompanion(companionId);
      if (!candidate || candidate.familyId !== COMPANION_FAMILY_ID) throw fail(404, 'That companion could not be found.');
      if (!candidate.bornAt || candidate.archivedAt || candidate.lifecycle?.lifeStatus !== 'alive') throw fail(409, 'This companion is not available for a new conversation.');
      if (candidate.progression) {
        if (expectedRevision !== undefined && expectedRevision !== candidate.revision) throw fail(409, 'Your companion changed. Refresh and try again.');
        chatToken = randomUUID();
        const reserved = await Companion.findOneAndUpdate({ _id: companionId, familyId: COMPANION_FAMILY_ID,
          $or: [{ pendingChat: { $exists: false } }, { pendingChat: null }, { 'pendingChat.expiresAt': { $lte: new Date() } }] },
          { $set: { pendingChat: { operationId, token: chatToken, expiresAt: new Date(Date.now() + 30_000) } } }, { new: true }).lean();
        if (!reserved) throw fail(409, 'A conversation is already waiting for a reply.');
        try {
          if (!companionCapabilities().chat) throw fail(503, 'AI unavailable');
          await reserveGeneration(operationId, 'chats'); generationReserved = true;
          preparedReply = validatePetReplyAbilities(await chatWithCompanion(settledState(candidate), actor, text.trim(), language || 'en'), candidate, language || 'en');
        } catch (error) {
          if (error.status === 409) {
            await Companion.updateOne({ _id: companionId, 'pendingChat.token': chatToken }, { $unset: { pendingChat: 1 } });
            throw error;
          }
          preparedReply = fallbackPetReply(candidate, language || 'en');
        }
      } else {
        if (!companionCapabilities().chat) throw fail(503, 'Gemini chat is not connected yet. Add GEMINI_API_KEY on the server.');
        await reserveGeneration(operationId, 'chats'); generationReserved = true;
      }
    }
  }
  const mutate = (familyToken?: string) => withCompanionLock(operationId, async (state) => {
    const commandNow = new Date();
    if (expectedRevision !== undefined && expectedRevision !== state.revision && !(action === 'chat' && state.progression)) throw fail(409, 'Your companion changed. Refresh and try again.');
    if (action === 'chat' && state.progression && chatToken && (state.pendingChat?.token !== chatToken || new Date(state.pendingChat.expiresAt).getTime() <= Date.now())) throw fail(409, 'The conversation reservation expired. Try again.');
    let next = settledState(state, commandNow);
    if (action === 'adopt') {
      if (state.bornAt) throw fail(409, 'Your shared companion has already hatched. Reopen the widget to meet them.');
      const adoptedAt = commandNow;
      const adopted = { ...next, name: req.body.name.trim(), form: req.body.form, seed: req.body.seed.trim(), traits: startingTraits(req.body.temperament), appearance: req.body.appearance || next.appearance, bornAt: adoptedAt, needsUpdatedAt: adoptedAt,
        lifecycle: next.lifecycle ? { ...next.lifecycle, simulatedAgeHours: 0, lowNeedExposureHours: 0, simulationAt: adoptedAt, lastEngagementAt: adoptedAt, protectionUntil: null, terminalAt: null, terminalReason: null, lifeStatus: 'alive', healthCondition: 'well', stage: 'hatchling', stageCareCount: 0 } : next.lifecycle };
      return petGameplayEnabled() ? grantTutorial(initializePetProgression(adopted as StoredCompanion, adoptedAt), adoptedAt) : adopted as StoredCompanion;
    }
    if (!state.bornAt) throw fail(409, 'Hatch your shared companion first.');
    if (state.archivedAt && action !== 'restore' && action !== 'growthAck') throw fail(409, 'Restore this companion before sharing another moment.');
    if (action === 'archive') return { ...next, archivedAt: commandNow };
    if (action === 'restore') {
      if (!state.archivedAt) return next;
      const archivedAtMs = new Date(state.archivedAt).getTime();
      const restUntilMs = state.restUntil ? new Date(state.restUntil).getTime() : Number.NaN;
      const remainingRestMs = state.behaviorState === 'resting' && Number.isFinite(restUntilMs) && Number.isFinite(archivedAtMs)
        ? Math.max(0, restUntilMs - archivedAtMs)
        : 0;
      return { ...next, archivedAt: null, needsUpdatedAt: commandNow, restUntil: remainingRestMs ? new Date(commandNow.getTime() + remainingRestMs) : null, behaviorState: remainingRestMs ? 'resting' : 'active', ...(next.lifecycle ? { lifecycle: { ...next.lifecycle, simulationAt: commandNow, lastEngagementAt: commandNow } } : {}) };
    }
    if (next.lifecycle?.lifeStatus !== 'alive' && action !== 'forget' && action !== 'growthAck') throw fail(409, 'This companion is now part of your family history. Their memories remain available.');
    if (action === 'visit') return next.progression ? settlePetRest(engageCompanion(next, commandNow), commandNow, actor) : engageCompanion(next, commandNow);
    if (action === 'growthAck') return next; // Ownership and acknowledgment are checked in the transaction.
    if (action === 'morphPreference' && next.progression) return { ...next, progression: { ...next.progression, morphPreference: req.body.preference } };
    if (action === 'promptChoice') return choosePetPrompt(next, req.body.choice, commandNow, actor, operationId);
    if (action === 'startActivity') return startPetActivity(engageCompanion(next, commandNow), req.body.family, req.body.capability || null, actor, commandNow);
    if (action === 'activityStep') return completePetActivityStep(engageCompanion(next, commandNow), req.body.sessionId, req.body.answer, actor, commandNow, operationId);
    if (action === 'retire') {
      if (expectedRevision !== state.revision) throw fail(409, 'Your companion changed. Refresh before retiring.');
      return retireCompanion(next, commandNow);
    }
    if (action === 'customize') {
      if (expectedRevision !== state.revision) throw fail(409, 'Your companion changed while you were editing. Refresh and try again.');
      if (next.progression && req.body.appearance.species !== next.progression.render.species) throw fail(409, 'Species is part of this companion’s identity. Hatch a new companion to choose another species.');
      return { ...next, name: req.body.name.trim(), form: req.body.form, seed: req.body.seed.trim(), appearance: req.body.appearance };
    }
    if (action === 'appearance') {
      if (next.progression && req.body.appearance.species !== next.progression.render.species) throw fail(409, 'Species is part of this companion’s identity.');
      return { ...next, appearance: req.body.appearance };
    }
    if (action === 'chatColor') return { ...next, chatColor: req.body.color };
    if (action === 'inspiration') {
      if (expectedRevision !== state.revision) throw fail(409, 'Your companion changed while you were editing. Refresh and try again.');
      return { ...next, inspirations: { ...state.inspirations, [actor]: text.trim() } };
    }
    if (action === 'forget') {
      if (!state.memories.some((memory) => memory.id === memoryId)) throw fail(404, 'That memory is already gone.');
      return forgetMemory(next, memoryId);
    }
    if (LIFECYCLE_ACTIONS.includes(action)) {
      if (state.lastCare?.[actor] && commandNow.getTime() - new Date(state.lastCare[actor]).getTime() < (state.progression ? 60_000 : 5000)) throw fail(429, 'Let your companion enjoy this moment. Try again in a little while.');
      if (next.progression) {
        const cared = applyPetCare(next, action, commandNow, actor, operationId);
        return { ...completeDailyRitual(remember(cared, actor, action, `${displayName(actor)} chose to ${action} with me.`, commandNow), action, actor, commandNow), lastCare: { ...state.lastCare, [actor]: commandNow } };
      }
      if (state.lifecycle) {
        const cared = applyLifecycleCare(next, action, commandNow, actor);
        const withMemory = remember(cared, actor, action, `${displayName(actor)} chose to ${action} with me.`, commandNow);
        return { ...completeDailyRitual(withMemory, action, actor, commandNow), bonds: { ...cared.bonds, [actor]: cared.bonds[actor] + 1 }, lastCare: { ...state.lastCare, [actor]: commandNow } };
      }
      return { ...completeDailyRitual(careFor(state, actor, action, commandNow), action, actor, commandNow), lastCare: { ...state.lastCare, [actor]: commandNow } };
    }
    if (action === 'chat') {
      const reply = next.progression ? validatePetReplyAbilities(preparedReply || fallbackPetReply(next, language || 'en'), next, language || 'en') : await chatWithCompanion(next, actor, text.trim(), language || 'en');
      const id = randomUUID();
      next = remember(next, actor, 'conversation', text.trim(), new Date(), id);
      if (next.progression) {
        next = rewardPetAction(engageCompanion(next, commandNow), 'chat', commandNow, operationId, actor);
        const cutoff = commandNow.getTime() - 14 * 86_400_000;
        return { ...next, mood: reply.mood, thought: reply.thought,
          turns: [...next.turns.filter((turn) => new Date(turn.at).getTime() >= cutoff), { id, actor, text: text.trim(), at: commandNow }, { id, actor: 'companion', text: reply.reply, at: commandNow }].slice(-60) };
      }
      const day = new Date().toISOString().slice(0, 10);
      const budget = next.xpBudget?.day === day ? next.xpBudget : { day, care: 0, chat: 0 };
      const chatReward = next.lifecycle ? 4 : budget.chat < 12 ? 4 : 0;
      const growth = reply.growth && reply.growth !== 'none' ? reply.growth : null;
      return { ...engageCompanion(next, commandNow), mood: reply.mood, thought: reply.thought, xp: next.lifecycle ? addXp(next.xp, chatReward) : next.xp + chatReward, xpBudget: { ...budget, chat: budget.chat + chatReward },
        traits: growth ? { ...next.traits, [growth]: Math.min(100, next.traits[growth] + 1) } : next.traits,
        turns: [...state.turns, { id, actor, text: text.trim(), at: new Date() }, { id, actor: 'companion', text: reply.reply, at: new Date() }].slice(-60) };
    }
    throw fail(400, 'Choose a supported companion action.');
  }, companionId, { actor, payload: req.body, familyToken });
  try {
    const saved = action === 'restore' ? await withFamilyLock(async (_family, token) => {
      await migrateCompanionRoster();
      if (await Companion.countDocuments(activeFilter) >= ACTIVE_COMPANION_LIMIT) throw fail(409, 'Your companion family already has six active companions. Archive one before restoring another.');
      return mutate(token);
    }) : await mutate();
    await respond(res, saved);
  } catch (error) {
    if (generationReserved) await releaseGeneration(operationId, 'chats').catch(() => {});
    throw error;
  } finally {
    if (chatToken) await Companion.updateOne({ _id: companionId, 'pendingChat.token': chatToken }, { $unset: { pendingChat: 1 } }).catch(() => {});
  }
});
