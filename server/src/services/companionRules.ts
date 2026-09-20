import type { CompanionGrowthStage, LifecycleCareAction } from '../../../shared/contracts.js';

export const COMPANION_RULES_VERSION = 3 as const;
export const HOUR_MS = 3_600_000;
export const MAX_OFFLINE_HOURS = 24;
export const RETURN_PROTECTION_HOURS = 24;
export const NATURAL_DEATH_HOURS = 90 * 24;
export const ELDER_HOURS = 60 * 24;
export const MEDICINE_COOLDOWN_MS = 6 * HOUR_MS;

export const NEED_RATES = Object.freeze({ fullness: -3, energy: -2, joy: -2, comfort: -1.5, hygiene: -2 });
export const STAGE_GATES: ReadonlyArray<{ stage: CompanionGrowthStage; ageHours: number; care: number }> = Object.freeze([
  { stage: 'child', ageHours: 2 * 24, care: 6 },
  { stage: 'juvenile', ageHours: 7 * 24, care: 18 },
  { stage: 'grown', ageHours: 14 * 24, care: 36 },
  { stage: 'elder', ageHours: ELDER_HOURS, care: 0 },
]);

export const CARE_EFFECTS: Readonly<Record<LifecycleCareAction, Readonly<Record<string, number>>>> = Object.freeze({
  feed: { fullness: 24, joy: 4, comfort: 3 }, play: { fullness: -5, energy: -12, joy: 24, comfort: 4 },
  cuddle: { energy: 4, joy: 14, comfort: 26 }, rest: { fullness: -2, joy: 3, comfort: 12 },
  explore: { fullness: -6, energy: -10, joy: 16, comfort: 2 }, clean: { hygiene: 30 }, medicine: { health: 30 },
});

export const primaryNeed = (action: LifecycleCareAction): 'fullness' | 'energy' | 'joy' | 'comfort' | 'hygiene' | 'health' => action === 'feed' ? 'fullness'
  : action === 'rest' ? 'energy' : action === 'cuddle' ? 'comfort' : action === 'clean' ? 'hygiene' : action === 'medicine' ? 'health' : 'joy';
