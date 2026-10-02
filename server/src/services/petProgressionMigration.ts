import type { StoredCompanion } from '../../../shared/contracts.js';
import { PET_CATALOG_VERSION, PET_CONFIG_VERSION, PET_RNG_VERSION, petLevel } from './petCatalog.js';

/** Called only within a leased command; historical snapshots are never relabelled. */
export function enrollPetForms(input: StoredCompanion): StoredCompanion {
  const old = input.progression;
  if (!old) return input;
  const state = { ...input, progression: structuredClone(old) };
  const p = state.progression;
  const appearanceSpecies = input.appearance?.species || (input.form === 'pet' ? 'bunny' : input.form === 'child' ? 'child' : 'spirit');
  if (appearanceSpecies !== p.render.species) {
    p.contentBlocked = 'Saved species differs from appearance. Repair is required before enrollment.'; return state;
  }
  if (p.version !== 1 || p.configVersion !== PET_CONFIG_VERSION || p.catalogVersion !== PET_CATALOG_VERSION || p.rngVersion !== PET_RNG_VERSION
    || p.formEngineVersion !== undefined && p.formEngineVersion !== 1) {
    p.contentBlocked = 'This saved progression version requires an explicit migration.'; return state;
  }
  if (p.formEngineVersion === 1) return state;
  p.formEngineVersion = 1;
  // Preserve high-level legacy baseline; award only newly earned future levels.
  p.formBaselineLevel = Math.max(p.appearanceLevel, p.legacyLevel || 1, petLevel(input.xp, p.legacyLevel));
  if (p.formBaselineLevel > 10) p.appearanceLevel = p.formBaselineLevel;
  p.presentationSequence = Math.max(0, ...p.events.map((event) => event.presentationSequence));
  p.formPlan = null; p.formDecision = null; p.recentFormIds = p.render.bodyForm ? [p.render.bodyForm.id] : [];
  return state;
}
