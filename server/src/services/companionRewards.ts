import { primaryNeed } from './companionRules.js';
import { CARE_EFFECTS, MEDICINE_COOLDOWN_MS } from './companionRules.js';
import { engageCompanion } from './companionSimulation.js';
import { advanceLifecycle } from './companionLifecycle.js';
import { randomUUID } from 'node:crypto';
import type { LifecycleCareAction, Profile, StoredCompanion } from '../../../shared/contracts.js';

export interface CareReward { xp: number; meaningful: boolean; requestBonus: boolean }

export function careReward(before: StoredCompanion, after: StoredCompanion, action: LifecycleCareAction): CareReward {
  const need = primaryNeed(action);
  const meaningful = before.needs[need] < 85 && (after.needs[need] > before.needs[need]
    || (action === 'rest' && before.behaviorState !== 'resting' && after.behaviorState === 'resting'));
  const requestBonus = meaningful && before.careRequest?.state === 'active' && before.careRequest.action === action;
  return { meaningful, requestBonus, xp: meaningful ? 8 + (requestBonus ? 4 : 0) : 0 };
}

export function addXp(current: number, reward: number): number {
  if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(reward) || reward < 0 || !Number.isSafeInteger(current + reward)) throw new Error('Companion XP is invalid.');
  return current + reward;
}

export function addSafeXp(current: number, reward: number): number { return addXp(current, reward); }
export function evaluateChatReward() { return { earnedXp: 4 }; }
export function evaluateCareReward(state: StoredCompanion, action: LifecycleCareAction) {
  const need = primaryNeed(action);
  const meaningful = state.needs[need] < 85;
  return { earnedXp: meaningful ? 8 : 0, isMeaningfulCare: meaningful };
}
export function isMedicineEligible(state: StoredCompanion, now = new Date()) {
  const lifecycle = state.lifecycle;
  const lastMedicineAt = lifecycle?.lastMedicineAt || (state as any).lastMedicineAt;
  const eligible = (lifecycle?.healthCondition || (state as any).healthCondition) === 'ill'
    && ((state.needs as any).health ?? (state as any).health ?? 100) < 100
    && (!lastMedicineAt || now.getTime() - new Date(lastMedicineAt).getTime() >= MEDICINE_COOLDOWN_MS);
  return { eligible };
}

export function applyLifecycleCare(input: StoredCompanion, action: LifecycleCareAction, now: Date, actor?: Profile, idFactory: () => string = randomUUID): StoredCompanion {
  const before = engageCompanion(input, now, idFactory);
  if (!before.lifecycle || before.lifecycle.lifeStatus !== 'alive') throw Object.assign(new Error('This companion cannot receive care.'), { status: 409 });
  if (action === 'rest' && before.behaviorState === 'resting' && before.restUntil && new Date(before.restUntil).getTime() > now.getTime()) throw Object.assign(new Error('This companion is already resting.'), { status: 409 });
  if (action === 'medicine') {
    if (before.lifecycle.healthCondition !== 'ill' || before.needs.health >= 100) throw Object.assign(new Error('Medicine is not needed right now.'), { status: 409 });
    if (before.lifecycle.lastMedicineAt && now.getTime() - new Date(before.lifecycle.lastMedicineAt).getTime() < MEDICINE_COOLDOWN_MS) throw Object.assign(new Error('Medicine is still on cooldown.'), { status: 429 });
  }
  const effects = CARE_EFFECTS[action];
  const needs = { ...before.needs };
  for (const [key, amount] of Object.entries(effects) as [keyof StoredCompanion['needs'], number][]) needs[key] = Math.max(0, Math.min(100, needs[key] + amount));
  let after: StoredCompanion = { ...before, needs, ...(action === 'rest' ? { behaviorState: 'resting' as const, restUntil: new Date(now.getTime() + 45 * 60_000) } : {}), lifecycle: { ...before.lifecycle, ...(action === 'medicine' ? { lastMedicineAt: now } : {}) } };
  const reward = careReward(before, after, action);
  const request = before.careRequest?.state === 'active' && before.careRequest.action === action && reward.meaningful
    ? { ...before.careRequest, state: 'fulfilled' as const, fulfilledAt: now, ...(actor ? { fulfilledBy: actor } : {}) }
    : before.careRequest;
  const summary = before.careSummary || { actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 }, caregivers: { joe: 0, focus: 0 } };
  after = { ...after, careRequest: request, xp: addXp(before.xp, reward.xp),
    careSummary: { actions: { ...summary.actions, [action]: (summary.actions[action] || 0) + 1 }, caregivers: actor ? { ...summary.caregivers, [actor]: summary.caregivers[actor] + 1 } : summary.caregivers },
    behaviorWindow: actor ? [...(before.behaviorWindow || []), { action, actor, at: now }].slice(-24) : before.behaviorWindow,
    lifecycle: { ...after.lifecycle!, stageCareCount: after.lifecycle!.stageCareCount + (reward.meaningful ? 1 : 0) } };
  return advanceLifecycle(after, now, idFactory);
}
