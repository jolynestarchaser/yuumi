import type {
  CareAction,
  Profile,
  StoredCompanion,
} from '../../../shared/contracts.js';
import {
  CARE_EFFECTS,
  MEANINGFUL_CARE_NEED_THRESHOLD,
  XP_MEANINGFUL_CARE,
  XP_REQUEST_BONUS,
  XP_SAVED_CHAT,
  MEDICINE_COOLDOWN_MS,
  clampStat,
} from './companionRules.js';

export interface RewardEvaluation {
  action: CareAction | 'chat' | 'visit' | 'other';
  isMeaningfulCare: boolean;
  isRequestFulfilled: boolean;
  earnedXp: number;
  reason?: string;
}

export function isMedicineEligible(state: StoredCompanion, now = new Date()): { eligible: boolean; reason?: string } {
  if (state.healthCondition !== 'ill') {
    return { eligible: false, reason: 'Companion is not ill.' };
  }
  const health = state.health ?? 100;
  if (health >= 100) {
    return { eligible: false, reason: 'Health is already full.' };
  }
  if (state.lastMedicineAt) {
    const elapsed = now.getTime() - new Date(state.lastMedicineAt).getTime();
    if (elapsed < MEDICINE_COOLDOWN_MS) {
      return { eligible: false, reason: 'Medicine cooldown has not elapsed yet.' };
    }
  }
  return { eligible: true };
}

/**
 * Evaluates care action reward on settled state.
 * Returns XP and whether action counts as meaningful care for stage development.
 */
export function evaluateCareReward(
  settledBefore: StoredCompanion,
  action: CareAction,
  now = new Date()
): RewardEvaluation {
  const effect = CARE_EFFECTS[action];
  if (!effect) {
    return { action, isMeaningfulCare: false, isRequestFulfilled: false, earnedXp: 0 };
  }

  // Check medicine special constraints
  if (action === 'medicine') {
    const medCheck = isMedicineEligible(settledBefore, now);
    if (!medCheck.eligible) {
      return {
        action,
        isMeaningfulCare: false,
        isRequestFulfilled: false,
        earnedXp: 0,
        reason: medCheck.reason,
      };
    }
  }

  // Get primary need value before care
  let primaryValBefore = 100;
  switch (effect.primaryNeed) {
    case 'fullness':
      primaryValBefore = settledBefore.needs.fullness;
      break;
    case 'energy':
      primaryValBefore = settledBefore.needs.energy;
      break;
    case 'joy':
      primaryValBefore = settledBefore.needs.joy;
      break;
    case 'comfort':
      primaryValBefore = settledBefore.needs.comfort ?? 75;
      break;
    case 'hygiene':
      primaryValBefore = settledBefore.needs.hygiene ?? 100;
      break;
    case 'health':
      primaryValBefore = settledBefore.health ?? 100;
      break;
  }

  // For rest: a useful nap start qualifies once despite recovery being deferred.
  // Starting a nap when energy is already >= 85 or when already resting does not qualify.
  if (action === 'rest') {
    const alreadyResting = settledBefore.behaviorState === 'resting' && settledBefore.restUntil && new Date(settledBefore.restUntil).getTime() > now.getTime();
    if (alreadyResting || primaryValBefore >= MEANINGFUL_CARE_NEED_THRESHOLD) {
      return { action, isMeaningfulCare: false, isRequestFulfilled: false, earnedXp: 0 };
    }
  }

  // Check if primary need is below 85 and actually improves
  const isPrimaryBelow85 = primaryValBefore < MEANINGFUL_CARE_NEED_THRESHOLD;
  const doesImprove = action === 'rest'
    ? true // Nap restores energy over time
    : effect[effect.primaryNeed] > 0 && clampStat(primaryValBefore + effect[effect.primaryNeed]) > primaryValBefore;

  const isMeaningfulCare = isPrimaryBelow85 && doesImprove;

  // Check care request fulfillment bonus (+4 XP)
  let isRequestFulfilled = false;
  const activeReq = settledBefore.careRequest;
  if (
    activeReq &&
    activeReq.state === 'active' &&
    activeReq.action === action &&
    isMeaningfulCare
  ) {
    isRequestFulfilled = true;
  }

  let earnedXp = 0;
  if (isMeaningfulCare) {
    earnedXp += XP_MEANINGFUL_CARE;
    if (isRequestFulfilled) {
      earnedXp += XP_REQUEST_BONUS;
    }
  }

  return {
    action,
    isMeaningfulCare,
    isRequestFulfilled,
    earnedXp,
  };
}

export function evaluateChatReward(): RewardEvaluation {
  return {
    action: 'chat',
    isMeaningfulCare: false,
    isRequestFulfilled: false,
    earnedXp: XP_SAVED_CHAT,
  };
}

export function addSafeXp(currentXp: number, deltaXp: number): number {
  if (deltaXp <= 0) return Math.max(0, currentXp);
  const sum = currentXp + deltaXp;
  if (!Number.isFinite(sum) || sum > Number.MAX_SAFE_INTEGER) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.floor(sum);
}
