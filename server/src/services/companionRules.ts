import type { CareAction, CompanionGrowthStage, CompanionMood, CompanionSpecies } from '../../../shared/contracts.js';

export const COMPANION_RULES_VERSION = 3;
export const COMPANION_FAMILY_ID = 'joe-and-focus';
export const COMPANION_KEY = 'joe-and-focus';

export const MAX_STAT = 100;
export const MIN_STAT = 0;

export const DECAY_RATES_PER_HOUR = Object.freeze({
  fullness: 3.0,
  energyAwake: 2.0,
  energyResting: -12.0, // negative decay = recovery
  joy: 2.0,
  comfort: 1.5,
  hygiene: 2.0,
});

export const HEALTH_ILLNESS_DRAIN_PER_HOUR = 5.0;
export const HEALTH_WELL_RECOVERY_PER_HOUR = 2.0;

export const LOW_NEED_THRESHOLD = 20.0;
export const RECOVERY_NEED_THRESHOLD = 40.0;
export const ILLNESS_EXPOSURE_HOURS = 6.0;
export const MEDICINE_COOLDOWN_MS = 6 * 3600 * 1000; // 6 hours wall clock
export const AUTO_PAUSE_HOURS = 24.0;
export const PROTECTION_WINDOW_HOURS = 24.0;
export const REST_DURATION_MINUTES = 45;

export const STAGE_GATES = Object.freeze({
  hatchling: { minAgeDays: 0, minAgeHours: 0, requiredCareCount: 0 },
  child: { minAgeDays: 2, minAgeHours: 48, requiredCareCount: 6 },
  juvenile: { minAgeDays: 7, minAgeHours: 168, requiredCareCount: 18 },
  grown: { minAgeDays: 14, minAgeHours: 336, requiredCareCount: 36 },
  elder: { minAgeDays: 60, minAgeHours: 1440, requiredCareCount: 0 },
  naturalDeath: { minAgeDays: 90, minAgeHours: 2160, requiredCareCount: 0 },
});

export const XP_MEANINGFUL_CARE = 8;
export const XP_REQUEST_BONUS = 4;
export const XP_SAVED_CHAT = 4;
export const MEANINGFUL_CARE_NEED_THRESHOLD = 85.0;
export const LEVEL_XP = 80;

export interface CareEffectDefinition {
  fullness: number;
  energy: number;
  joy: number;
  comfort: number;
  hygiene: number;
  health: number;
  primaryNeed: 'fullness' | 'energy' | 'joy' | 'comfort' | 'hygiene' | 'health';
  mood: CompanionMood;
  trait: 'curiosity' | 'affection' | 'playfulness';
  napMinutes?: number;
}

export const CARE_EFFECTS: Readonly<Record<CareAction, CareEffectDefinition>> = Object.freeze({
  feed: {
    fullness: 24, energy: 0, joy: 4, comfort: 3, hygiene: 0, health: 0,
    primaryNeed: 'fullness', mood: 'cozy', trait: 'affection',
  },
  play: {
    fullness: -5, energy: -12, joy: 24, comfort: 4, hygiene: 0, health: 0,
    primaryNeed: 'joy', mood: 'playful', trait: 'playfulness',
  },
  cuddle: {
    fullness: 0, energy: 4, joy: 14, comfort: 26, hygiene: 0, health: 0,
    primaryNeed: 'comfort', mood: 'cozy', trait: 'affection',
  },
  rest: {
    fullness: -2, energy: 0, joy: 3, comfort: 12, hygiene: 0, health: 0,
    primaryNeed: 'energy', mood: 'sleepy', trait: 'affection', napMinutes: REST_DURATION_MINUTES,
  },
  explore: {
    fullness: -6, energy: -10, joy: 16, comfort: 2, hygiene: 0, health: 0,
    primaryNeed: 'joy', mood: 'curious', trait: 'curiosity',
  },
  clean: {
    fullness: 0, energy: 0, joy: 0, comfort: 0, hygiene: 30, health: 0,
    primaryNeed: 'hygiene', mood: 'happy', trait: 'affection',
  },
  medicine: {
    fullness: 0, energy: 0, joy: 0, comfort: 0, hygiene: 0, health: 30,
    primaryNeed: 'health', mood: 'cozy', trait: 'affection',
  },
});

export const ALL_CARE_ACTIONS: readonly CareAction[] = Object.freeze([
  'feed', 'play', 'cuddle', 'rest', 'explore', 'clean', 'medicine',
]);

export const ALL_MOODS: readonly CompanionMood[] = Object.freeze([
  'curious', 'happy', 'cozy', 'sleepy', 'playful',
]);

export function clampStat(value: number, min = MIN_STAT, max = MAX_STAT): number {
  if (Number.isNaN(value)) return min;
  const clamped = Math.max(min, Math.min(max, value));
  return Math.abs(clamped - Math.round(clamped)) < 1e-6 ? Math.round(clamped) : Math.round(clamped * 10000) / 10000;
}
