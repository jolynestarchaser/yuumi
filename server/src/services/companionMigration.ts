import Companion from '../models/Companion.js';
import CompanionFamily from '../models/CompanionFamily.js';
import { COMPANION_FAMILY_ID, COMPANION_SCHEMA_VERSION } from './companionState.js';
import type { StoredCompanion } from '../../../shared/contracts.js';

export function companionMigrationPatch(state: Partial<StoredCompanion>, now = new Date()) {
  const patch: Record<string, unknown> = {};
  if (!state.familyId) patch.familyId = COMPANION_FAMILY_ID;
  if (state.schemaVersion !== COMPANION_SCHEMA_VERSION) patch.schemaVersion = COMPANION_SCHEMA_VERSION;
  if (state.archivedAt === undefined) patch.archivedAt = null;
  if (!state.needsUpdatedAt) patch.needsUpdatedAt = state.updatedAt || now;
  if (state.needs?.comfort === undefined) patch['needs.comfort'] = 75;
  return patch;
}

export async function migrateCompanion(companionId: string) {
  const state = await Companion.findById(companionId).lean();
  if (!state) return null;
  const patch = companionMigrationPatch(state);
  if (Object.keys(patch).length) await Companion.updateOne({ _id: companionId }, { $set: patch });
  const { ['needs.comfort']: comfort, ...topLevel } = patch;
  return { ...state, ...topLevel, needs: { ...state.needs, ...(comfort === undefined ? {} : { comfort }) } } as StoredCompanion;
}

export async function migrateCompanionRoster() {
  const companions = await Companion.find({}).lean();
  let changed = 0;
  for (const companion of companions) {
    const patch = companionMigrationPatch(companion);
    if (!Object.keys(patch).length) continue;
    await Companion.updateOne({ _id: companion._id }, { $set: patch });
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
