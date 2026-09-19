import { randomUUID } from 'node:crypto';
import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import { evolveCompanion } from '../services/companionEvolution.js';
import {
  ACTIONS,
  COMPANION_FAMILY_ID,
  COMPANION_KEY,
  careFor,
  forgetMemory,
  initialCompanion,
  publicCompanion,
  refreshCareRequest,
  remember,
  settledState,
  startingTraits,
  validateSetup,
  validateAppearance,
} from '../services/companionState.js';
import { applyEngagement } from '../services/companionSimulation.js';
import { retireElder, createSuccessorState } from '../services/companionLifecycle.js';
import { addSafeXp } from '../services/companionRewards.js';
import { executeCompanionMutation, withFamilyLock, fail, hashPayload } from '../services/companionMutation.js';
import { ensureCompanionFamily, migrateCompanion, migrateCompanionRoster } from '../services/companionMigration.js';
import { chatWithCompanion, companionCapabilities } from '../services/companionBrain.js';
import type { StoredCompanion, CompanionBudget, Profile } from '../../../shared/contracts.js';

export const ACTIVE_COMPANION_LIMIT = 6;
const OPERATION_ID = /^[a-zA-Z0-9-]{10,80}$/;

const respond = (res: any, state: StoredCompanion) =>
  res.json({ success: true, data: { companion: publicCompanion(state), capabilities: companionCapabilities() } });

const wrap = (handler: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try {
    await handler(req, res);
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: { code: 'COMPANION_ERROR', message: error.status ? error.message : 'Could not save your companion. Please try again.' }
    });
  }
};

async function ensureLegacyCompanion() {
  try {
    await Companion.updateOne({ _id: COMPANION_KEY }, { $setOnInsert: { ...initialCompanion(), _id: COMPANION_KEY } }, { upsert: true });
  } catch (error: any) {
    if (error.code !== 11000) throw error;
  }
  await migrateCompanion(COMPANION_KEY);
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

const validCompanionId = (value: unknown): value is string =>
  typeof value === 'string' && (value === COMPANION_KEY || /^companion-[a-f0-9-]{36}$/.test(value));
const validOperationId = (value: unknown): value is string =>
  typeof value === 'string' && OPERATION_ID.test(value);

// Terminal (retired, deceased) and archived companions do NOT count against the 6 active limit
const activeFilter = {
  familyId: COMPANION_FAMILY_ID,
  archivedAt: null,
  bornAt: { $ne: null },
  lifeStatus: { $in: ['alive', undefined] },
};

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
  const companions = await Companion.find(
    { familyId: COMPANION_FAMILY_ID, ...(includeArchived ? {} : { archivedAt: null }) },
    { _id: 1, name: 1, bornAt: 1, archivedAt: 1, mood: 1, xp: 1, appearance: 1, form: 1, revision: 1, lifeStatus: 1, generation: 1 }
  ).sort({ bornAt: 1 }).lean();

  res.json({
    success: true,
    data: {
      companions: companions.map((companion) => ({
        id: companion._id,
        name: companion.name,
        bornAt: companion.bornAt,
        archivedAt: companion.archivedAt,
        mood: companion.mood,
        level: Math.floor((companion.xp || 0) / 80) + 1,
        form: companion.form,
        appearance: companion.appearance,
        revision: companion.revision,
        lifeStatus: companion.lifeStatus || 'alive',
        generation: companion.generation || 1,
      })),
      activeLimit: ACTIVE_COMPANION_LIMIT
    }
  });
});

export const createCompanion = wrap(async (req, res) => {
  if (!validateSetup(req.body)) {
    throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  }
  if (!validOperationId(req.body?.operationId)) {
    throw fail(400, 'A valid operation ID is required.');
  }

  const predecessorId = req.body.predecessorId;
  const created = await withFamilyLock(async () => {
    await migrateCompanionRoster();

    // Idempotent replay for same createdOperationId
    const replay = await Companion.findOne({ familyId: COMPANION_FAMILY_ID, createdOperationId: req.body.operationId }).lean();
    if (replay) return replay;

    if (predecessorId) {
      // Check for an existing successor created for this predecessor
      const existingSuccessor = await Companion.findOne({ familyId: COMPANION_FAMILY_ID, predecessorId }).lean();
      if (existingSuccessor) return existingSuccessor;

      const predecessor = await Companion.findOne({ _id: predecessorId, familyId: COMPANION_FAMILY_ID }).lean();
      if (!predecessor) throw fail(404, 'Predecessor companion could not be found.');
      if (predecessor.lifeStatus !== 'retired' && predecessor.lifeStatus !== 'deceased') {
        throw fail(409, 'Only retired or deceased companions can have a successor.');
      }

      const activeCount = await Companion.countDocuments(activeFilter);
      if (activeCount >= ACTIVE_COMPANION_LIMIT) {
        throw fail(409, 'Your companion family already has six active companions. Archive one before hatching another.');
      }

      const id = `companion-${randomUUID()}`;
      const state = createSuccessorState(predecessor as StoredCompanion, req.body, id);
      return (await Companion.create({ ...state, createdOperationId: req.body.operationId })).toObject();
    }

    const activeCount = await Companion.countDocuments(activeFilter);
    if (activeCount >= ACTIVE_COMPANION_LIMIT) {
      throw fail(409, 'Your companion family already has six active companions. Archive one before hatching another.');
    }

    const id = `companion-${randomUUID()}`;
    const state = initialCompanion();
    state.name = req.body.name.trim();
    state.form = req.body.form;
    state.seed = req.body.seed.trim();
    state.traits = startingTraits(req.body.temperament);
    state.appearance = req.body.appearance || state.appearance;
    state.bornAt = new Date();
    state.simulatedAt = state.bornAt;
    state.lastEngagementAt = state.bornAt;
    state.needsUpdatedAt = state.bornAt;
    return (await Companion.create({ ...state, _id: id, createdOperationId: req.body.operationId })).toObject();
  });

  res.status(201).json({ success: true, data: { id: created._id, companion: publicCompanion(created as StoredCompanion) } });
});

export const interactWithCompanion = wrap(async (req, res) => {
  const { action, text, operationId, memoryId, expectedRevision, companionId = COMPANION_KEY, language } = req.body || {};
  const actor = req.desktop.profile as Profile;

  if (!validOperationId(operationId)) throw fail(400, 'A valid operation ID is required.');
  if (!validCompanionId(companionId)) throw fail(400, 'Choose a valid companion.');
  if (!['adopt', 'customize', 'inspiration', 'chat', 'chatColor', 'appearance', 'portrait', 'forget', 'archive', 'restore', 'visit', 'retire', ...ACTIONS].includes(action)) {
    throw fail(400, 'Choose a supported companion action.');
  }

  if (action === 'customize' && (!validateSetup({ ...req.body, temperament: 'curious' }) || !validateAppearance(req.body.appearance))) {
    throw fail(400, 'Choose a valid name, description, form, and appearance.');
  }
  if (action === 'appearance' && !validateAppearance(req.body.appearance)) {
    throw fail(400, 'Choose soft or pixel art and valid animation settings.');
  }
  if (action === 'adopt' && !validateSetup(req.body)) {
    throw fail(400, 'Choose a name (up to 32 characters), form, and description (up to 500 characters).');
  }
  if (action === 'inspiration' && (typeof text !== 'string' || text.length > 300)) {
    throw fail(400, 'Your inspiration can be up to 300 characters.');
  }
  if (action === 'chat' && (typeof text !== 'string' || !text.trim() || text.trim().length > 1000)) {
    throw fail(400, 'Write a message between 1 and 1,000 characters.');
  }
  if (action === 'chatColor' && (typeof req.body?.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(req.body.color))) {
    throw fail(400, 'Choose a valid companion chat color.');
  }
  if (action === 'chat' && !companionCapabilities().chat) {
    throw fail(503, 'Gemini chat is not connected yet. Add GEMINI_API_KEY on the server.');
  }
  if (action === 'portrait') {
    throw fail(410, 'Portrait generation has been retired. Your companion now grows through built-in animated forms.');
  }
  if (action === 'forget' && (typeof memoryId !== 'string' || memoryId.length > 80)) {
    throw fail(400, 'Choose a valid memory.');
  }
  if (action === 'retire' && typeof expectedRevision !== 'number') {
    throw fail(400, 'Expected revision is required to confirm retirement.');
  }

  // Pre-reserve generation allowance outside database transaction
  if (action === 'chat') {
    await reserveGeneration(operationId, 'chats');
  }

  // Execute mutation through durable operation service
  const snapshot = await executeCompanionMutation({
    companionId,
    operationId,
    actor,
    action,
    payload: req.body,
    mutate: async (state) => {
      let next = state;

      if (action === 'adopt') {
        if (state.bornAt) throw fail(409, 'Your shared companion has already hatched. Reopen the widget to meet them.');
        const now = new Date();
        return {
          ...next,
          name: req.body.name.trim(),
          form: req.body.form,
          seed: req.body.seed.trim(),
          traits: startingTraits(req.body.temperament),
          appearance: req.body.appearance || next.appearance,
          bornAt: now,
          simulatedAt: now,
          lastEngagementAt: now,
          needsUpdatedAt: now,
        };
      }

      if (!state.bornAt) throw fail(409, 'Hatch your shared companion first.');

      // Terminal companion checks
      if ((state.lifeStatus === 'deceased' || state.lifeStatus === 'retired') && !['forget', 'visit'].includes(action)) {
        throw fail(409, 'Cannot perform active interactions on a retired or deceased companion.');
      }

      if (state.archivedAt && action !== 'restore') {
        throw fail(409, 'Restore this companion before sharing another moment.');
      }

      if (action === 'archive') {
        return { ...next, archivedAt: new Date() };
      }

      if (action === 'restore') {
        if (!state.archivedAt) return next;
        await withFamilyLock(async () => {
          await migrateCompanionRoster();
          const activeCount = await Companion.countDocuments(activeFilter);
          if (activeCount >= ACTIVE_COMPANION_LIMIT) {
            throw fail(409, 'Your companion family already has six active companions. Archive one before restoring another.');
          }
        });
        const now = new Date();
        // Preserve remaining nap duration if was resting
        let restUntil = next.restUntil;
        if (next.behaviorState === 'resting' && restUntil) {
          const remainingNapMs = Math.max(0, new Date(restUntil).getTime() - new Date(next.simulatedAt || next.needsUpdatedAt || now).getTime());
          restUntil = remainingNapMs > 0 ? new Date(now.getTime() + remainingNapMs) : null;
        }
        return {
          ...next,
          archivedAt: null,
          simulatedAt: now,
          needsUpdatedAt: now,
          lastEngagementAt: now,
          restUntil,
          behaviorState: restUntil ? 'resting' : 'active',
        };
      }

      if (action === 'visit') {
        return applyEngagement(next, new Date());
      }

      if (action === 'retire') {
        return retireElder(next, expectedRevision, new Date());
      }

      if (action === 'customize') {
        if (expectedRevision !== state.revision) {
          throw fail(409, 'Your companion changed while you were editing. Refresh and try again.');
        }
        return {
          ...next,
          name: req.body.name.trim(),
          form: req.body.form,
          seed: req.body.seed.trim(),
          appearance: req.body.appearance,
        };
      }

      if (action === 'appearance') return { ...next, appearance: req.body.appearance };
      if (action === 'chatColor') return { ...next, chatColor: req.body.color };
      if (action === 'inspiration') {
        if (expectedRevision !== state.revision) {
          throw fail(409, 'Your companion changed while you were editing. Refresh and try again.');
        }
        return { ...next, inspirations: { ...state.inspirations, [actor]: text.trim() } };
      }

      if (action === 'forget') {
        if (!state.memories.some((memory) => memory.id === memoryId)) {
          throw fail(404, 'That memory is already gone.');
        }
        return forgetMemory(next, memoryId);
      }

      if (ACTIONS.includes(action as any)) {
        if (action !== 'medicine' && state.lastCare?.[actor] && Date.now() - new Date(state.lastCare[actor]!).getTime() < 5000) {
          throw fail(429, 'Let your companion enjoy this moment. Try again in a few seconds.');
        }
        const cared = careFor(next, actor, action as any, new Date());
        const previousXp = next.xp;
        const evolved = evolveCompanion(refreshCareRequest(cared), previousXp);
        return {
          ...evolved,
          lastCare: { ...state.lastCare, [actor]: new Date() },
        };
      }

      if (action === 'chat') {
        const lang = language === 'en' ? 'en' : 'th';
        const reply = await chatWithCompanion(next, actor, text.trim(), lang);
        const id = randomUUID();
        const now = new Date();
        next = remember(next, actor, 'conversation', text.trim(), now, id);

        // Unlimited chat XP: 4 XP each time
        const updatedXp = addSafeXp(next.xp, 4);
        const previousXp = next.xp;

        const growthTrait = reply.growth;
        if (growthTrait && ['curiosity', 'affection', 'playfulness'].includes(growthTrait)) {
          next.traits = {
            ...next.traits,
            [growthTrait]: Math.min(100, (next.traits[growthTrait] || 0) + 1),
          };
        }

        next = {
          ...next,
          mood: reply.mood,
          thought: reply.thought,
          xp: updatedXp,
          turns: [
            ...state.turns,
            { id, actor, text: text.trim(), at: now },
            { id, actor: 'companion' as const, text: reply.reply, at: now }
          ].slice(-60),
          lastEngagementAt: now,
        };

        return evolveCompanion(refreshCareRequest(next), previousXp);
      }

      throw fail(400, 'Choose a supported companion action.');
    },
  });

  res.json({ success: true, data: snapshot });
});
