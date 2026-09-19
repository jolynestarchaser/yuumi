import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import { COMPANION_FAMILY_ID, COMPANION_SCHEMA_VERSION, growthStageForLevel } from './companionState.js';
import { STAGE_GATES } from './companionRules.js';
import type { StoredCompanion, CompanionGrowthStage } from '../../../shared/contracts.js';

export function getInitialSimulatedAge(stage: CompanionGrowthStage | undefined, level: number): number {
  const currentStage = stage || growthStageForLevel(level);
  switch (currentStage) {
    case 'child':
      return STAGE_GATES.child.minAgeHours; // 48
    case 'juvenile':
      return STAGE_GATES.juvenile.minAgeHours; // 168
    case 'grown':
    case 'elder':
      return STAGE_GATES.grown.minAgeHours; // 336
    case 'hatchling':
    default:
      return 0;
  }
}

export function companionMigrationPatch(state: Partial<StoredCompanion>, now = new Date()) {
  if (state.schemaVersion !== undefined && state.schemaVersion > COMPANION_SCHEMA_VERSION) {
    throw new Error(`Cannot migrate companion with schema version ${state.schemaVersion}; max supported version is ${COMPANION_SCHEMA_VERSION}.`);
  }

  const patch: Record<string, unknown> = {};
  if (!state.familyId) patch.familyId = COMPANION_FAMILY_ID;
  if (state.schemaVersion !== COMPANION_SCHEMA_VERSION) patch.schemaVersion = COMPANION_SCHEMA_VERSION;
  if (state.archivedAt === undefined) patch.archivedAt = null;
  if (!state.needsUpdatedAt) patch.needsUpdatedAt = state.updatedAt || now;
  if (!state.simulatedAt) patch.simulatedAt = now;
  if (!state.lastEngagementAt) patch.lastEngagementAt = now;
  if (state.protectionUntil === undefined) patch.protectionUntil = null;
  if (state.needs?.comfort === undefined) patch['needs.comfort'] = 75;
  if (state.needs?.hygiene === undefined) patch['needs.hygiene'] = 100;
  if (state.health === undefined) patch.health = 100;
  if (state.hygiene === undefined) patch.hygiene = 100;
  if (!state.lifeStatus) patch.lifeStatus = 'alive';
  if (!state.healthCondition) patch.healthCondition = 'well';
  if (state.lowNeedExposureHours === undefined) patch.lowNeedExposureHours = 0;
  if (state.stageCareCount === undefined) patch.stageCareCount = 0;
  if (!state.lineageId) patch.lineageId = (state as StoredCompanion)._id || 'lineage-primary';
  if (state.generation === undefined) patch.generation = 1;
  if (state.predecessorId === undefined) patch.predecessorId = null;
  if (state.deceasedAt === undefined) patch.deceasedAt = null;
  if (state.deathReason === undefined) patch.deathReason = null;
  if (state.retiredAt === undefined) patch.retiredAt = null;
  if (state.lastMedicineAt === undefined) patch.lastMedicineAt = null;

  if (state.bornAt && state.simulatedAgeHours === undefined) {
    const existingStage = state.stageOutcomes?.at(-1)?.stage;
    const level = Math.floor((state.xp || 0) / 80) + 1;
    patch.simulatedAgeHours = getInitialSimulatedAge(existingStage, level);
  } else if (!state.bornAt && state.simulatedAgeHours === undefined) {
    patch.simulatedAgeHours = 0;
  }

  if (!state.behaviorState) patch.behaviorState = 'active';
  if (state.restUntil === undefined) patch.restUntil = null;
  if (state.careRequest === undefined) patch.careRequest = null;
  if (!state.careSummary) {
    patch.careSummary = {
      actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 },
      caregivers: { joe: 0, focus: 0 },
    };
  } else if (state.careSummary.actions) {
    if (state.careSummary.actions.clean === undefined) patch['careSummary.actions.clean'] = 0;
    if (state.careSummary.actions.medicine === undefined) patch['careSummary.actions.medicine'] = 0;
  }

  if (!state.behaviorWindow) patch.behaviorWindow = [];
  if (!state.stageOutcomes) patch.stageOutcomes = [];

  return patch;
}

export async function migrateCompanion(companionId: string, options: { dryRun?: boolean } = {}) {
  const state = await Companion.findById(companionId).lean();
  if (!state) return null;
  const patch = companionMigrationPatch(state as StoredCompanion);
  if (Object.keys(patch).length && !options.dryRun) {
    await Companion.updateOne({ _id: companionId }, { $set: patch });
  }
  const { ['needs.comfort']: comfort, ['needs.hygiene']: hygiene, ...topLevel } = patch;
  return {
    ...state,
    ...topLevel,
    needs: {
      ...state.needs,
      ...(comfort === undefined ? {} : { comfort: comfort as number }),
      ...(hygiene === undefined ? {} : { hygiene: hygiene as number }),
    },
  } as StoredCompanion;
}

export async function migrateCompanionRoster(options: { dryRun?: boolean } = {}) {
  const companions = await Companion.find({}).lean();
  let changed = 0;
  for (const companion of companions) {
    const patch = companionMigrationPatch(companion as StoredCompanion);
    if (!Object.keys(patch).length) continue;
    if (!options.dryRun) {
      await Companion.updateOne({ _id: companion._id }, { $set: patch });
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
