import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import { randomUUID } from 'node:crypto';
import { COMPANION_FAMILY_ID, COMPANION_SCHEMA_VERSION, growthStageForLevel } from './companionState.js';
import type { StoredCompanion } from '../../../shared/contracts.js';

export function companionMigrationPatch(state: Partial<StoredCompanion>, now = new Date()) {
  if (typeof state.schemaVersion === 'number' && state.schemaVersion > COMPANION_SCHEMA_VERSION) {
    throw new Error(`Companion schema ${state.schemaVersion} is newer than supported schema ${COMPANION_SCHEMA_VERSION}.`);
  }
  const patch: Record<string, unknown> = {};
  if (!state.familyId) patch.familyId = COMPANION_FAMILY_ID;
  if (state.schemaVersion !== COMPANION_SCHEMA_VERSION) patch.schemaVersion = COMPANION_SCHEMA_VERSION;
  if (state.archivedAt === undefined) patch.archivedAt = null;
  if (!state.needsUpdatedAt) patch.needsUpdatedAt = state.updatedAt || now;
  if (state.needs?.comfort === undefined) patch['needs.comfort'] = 75;
  if (state.needs?.hygiene === undefined) patch['needs.hygiene'] = 100;
  if (state.needs?.health === undefined) patch['needs.health'] = 100;
  if (!state.behaviorState) patch.behaviorState = 'active';
  if (state.restUntil === undefined) patch.restUntil = null;
  if (state.careRequest === undefined) patch.careRequest = null;
  if (!state.careSummary) patch.careSummary = { actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 }, caregivers: { joe: 0, focus: 0 } };
  else {
    if (state.careSummary.actions.clean === undefined) patch['careSummary.actions.clean'] = 0;
    if (state.careSummary.actions.medicine === undefined) patch['careSummary.actions.medicine'] = 0;
  }
  if (!state.xpBudget) patch.xpBudget = { day: now.toISOString().slice(0, 10), care: 0, chat: 0 };
  if (!state.behaviorWindow) patch.behaviorWindow = [];
  if (!state.stageOutcomes) patch.stageOutcomes = [];
  if (!state.lifecycleEvents) patch.lifecycleEvents = [];
  if (!state.lifecycle) {
    const stage = state.bornAt ? growthStageForLevel(Math.floor((state.xp || 0) / 80) + 1) : 'hatchling';
    const age = stage === 'grown' ? 14 * 24 : stage === 'juvenile' ? 7 * 24 : stage === 'child' ? 2 * 24 : 0;
    patch.lifecycle = { rulesVersion: 3, lifeStatus: 'alive', healthCondition: 'well', stage, simulatedAgeHours: age, stageCareCount: 0, lowNeedExposureHours: 0, simulationAt: now, lastEngagementAt: now, protectionUntil: null, lastMedicineAt: null, terminalAt: null, terminalReason: null, generation: 1, lineageId: String(state._id || randomUUID()), predecessorId: null };
  } else if (state.lifecycle.rulesVersion !== 3) patch['lifecycle.rulesVersion'] = 3;
  return patch;
}

export async function migrateCompanion(companionId: string) {
  const state = await Companion.findById(companionId).lean();
  if (!state) return null;
  const patch = companionMigrationPatch(state);
  if (Object.keys(patch).length) {
    const guard = state.revision === undefined
      ? { _id: companionId, schemaVersion: { $ne: COMPANION_SCHEMA_VERSION } }
      : { _id: companionId, revision: state.revision, schemaVersion: state.schemaVersion };
    const result = await Companion.updateOne(guard, { $set: patch, $inc: { revision: 1 } });
    if (!result.matchedCount) {
      const current = await Companion.findById(companionId).lean();
      if (!current) return null;
      if (current.schemaVersion && current.schemaVersion > COMPANION_SCHEMA_VERSION) throw new Error(`Companion schema ${current.schemaVersion} is newer than supported schema ${COMPANION_SCHEMA_VERSION}.`);
      return current as StoredCompanion;
    }
  }
  const { ['needs.comfort']: comfort, ['needs.hygiene']: hygiene, ['needs.health']: health, ['careSummary.actions.clean']: clean, ['careSummary.actions.medicine']: medicine, ['lifecycle.rulesVersion']: rulesVersion, ...topLevel } = patch;
  return { ...state, ...topLevel,
    needs: { ...state.needs, ...(comfort === undefined ? {} : { comfort }), ...(hygiene === undefined ? {} : { hygiene }), ...(health === undefined ? {} : { health }) },
    ...(clean === undefined && medicine === undefined ? {} : { careSummary: { ...state.careSummary!, actions: { ...state.careSummary!.actions, ...(clean === undefined ? {} : { clean }), ...(medicine === undefined ? {} : { medicine }) } } }),
    ...(rulesVersion === undefined ? {} : { lifecycle: { ...state.lifecycle!, rulesVersion } }),
  } as StoredCompanion;
}

export async function migrateCompanionRoster({ dryRun = false }: { dryRun?: boolean } = {}) {
  const companions = await Companion.find({}).lean();
  let changed = 0;
  for (const companion of companions) {
    const patch = companionMigrationPatch(companion);
    if (!Object.keys(patch).length) continue;
    if (!dryRun) {
      const guard = companion.revision === undefined
        ? { _id: companion._id, schemaVersion: { $ne: COMPANION_SCHEMA_VERSION } }
        : { _id: companion._id, revision: companion.revision, schemaVersion: companion.schemaVersion };
      await Companion.updateOne(guard, { $set: patch, $inc: { revision: 1 } });
    }
    changed += 1;
  }
  return { scanned: companions.length, changed };
}

export async function ensureCompanionFamily() {
  const today = new Date().toISOString().slice(0, 10);
  const legacy = await Companion.find({ 'budget.day': today }, { budget: 1 }).lean();
  const budget = legacy.reduce((result, companion) => ({
    day: today,
    chats: Math.min(60, result.chats + (companion.budget?.chats || 0)),
    portraits: Math.min(5, result.portraits + (companion.budget?.portraits || 0)),
    lastChat: !result.lastChat || (companion.budget?.lastChat && new Date(companion.budget.lastChat) > new Date(result.lastChat)) ? companion.budget?.lastChat : result.lastChat,
    lastPortrait: !result.lastPortrait || (companion.budget?.lastPortrait && new Date(companion.budget.lastPortrait) > new Date(result.lastPortrait)) ? companion.budget?.lastPortrait : result.lastPortrait
  }), { day: today, chats: 0, portraits: 0, lastChat: undefined, lastPortrait: undefined });
  try {
    await CompanionFamily.updateOne(
      { _id: COMPANION_FAMILY_ID },
      { $setOnInsert: { _id: COMPANION_FAMILY_ID, schemaVersion: 1, budget, recentOperations: [], lockedUntil: new Date(0) } },
      { upsert: true }
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}
