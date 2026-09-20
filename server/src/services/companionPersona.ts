import type { StoredCompanion } from '../../../shared/contracts.js';

export function companionPersona(state: StoredCompanion) {
  return { species: state.appearance?.species || state.form, stage: state.lifecycle?.stage || 'hatchling',
    temperament: state.traits, form: state.stageOutcomes?.at(-1)?.toFormId || null };
}
