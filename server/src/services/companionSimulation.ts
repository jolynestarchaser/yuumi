import { advanceLifecycle } from './companionLifecycle.js';
import { randomUUID } from 'node:crypto';
import { HOUR_MS, MAX_OFFLINE_HOURS, NATURAL_DEATH_HOURS, NEED_RATES, RETURN_PROTECTION_HOURS } from './companionRules.js';
import type { CompanionLifecycleEvent, StoredCompanion } from '../../../shared/contracts.js';

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const time = (value: string | Date | null | undefined, label: string): number => {
  const result = value ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(result)) throw new Error(`${label} is invalid.`);
  return result;
};

export interface SimulationResult { state: StoredCompanion; automaticallyPaused: boolean }

/** Settles version-three lifecycle time without persistence or provider access. */
export function simulateCompanion(input: StoredCompanion, now: Date, idFactory: () => string = randomUUID): SimulationResult {
  const lifecycle = input.lifecycle;
  if (!lifecycle || !input.bornAt || input.archivedAt || lifecycle.lifeStatus !== 'alive') return { state: input, automaticallyPaused: false };
  const nowMs = time(now, 'Simulation time');
  const clockMs = time(lifecycle.simulationAt, 'Stored simulation time');
  if (nowMs <= clockMs) return { state: input, automaticallyPaused: false };
  const engagementDeadline = time(lifecycle.lastEngagementAt, 'Last engagement') + MAX_OFFLINE_HOURS * HOUR_MS;
  const naturalDeathAt = clockMs + Math.max(0, NATURAL_DEATH_HOURS - lifecycle.simulatedAgeHours) * HOUR_MS;
  const endMs = Math.min(nowMs, engagementDeadline, naturalDeathAt);
  if (endMs <= clockMs) return { state: input, automaticallyPaused: true };
  const hours = (endMs - clockMs) / HOUR_MS;
  const restEndMs = input.behaviorState === 'resting' && input.restUntil ? time(input.restUntil, 'Rest end') : clockMs;
  if (restEndMs > clockMs && restEndMs < endMs) {
    const first = simulateCompanion(input, new Date(restEndMs), idFactory);
    const second = simulateCompanion(first.state, now, idFactory);
    return { state: second.state, automaticallyPaused: first.automaticallyPaused || second.automaticallyPaused };
  }
  const restHours = Math.max(0, Math.min(endMs, restEndMs) - clockMs) / HOUR_MS;
  const awakeHours = hours - restHours;
  const needs = {
    fullness: clamp(input.needs.fullness + NEED_RATES.fullness * hours),
    energy: clamp(input.needs.energy + restHours * 12 + NEED_RATES.energy * awakeHours),
    joy: clamp(input.needs.joy + NEED_RATES.joy * hours),
    comfort: clamp(input.needs.comfort + NEED_RATES.comfort * hours),
    hygiene: clamp(input.needs.hygiene + NEED_RATES.hygiene * hours),
    health: input.needs.health,
  };
  const initiallyLow = input.needs.fullness < 20 || input.needs.energy < 20 || input.needs.hygiene < 20;
  const low = needs.fullness < 20 || needs.energy < 20 || needs.hygiene < 20;
  const fullnessOnset = input.needs.fullness <= 20 ? 0 : (input.needs.fullness - 20) / Math.abs(NEED_RATES.fullness);
  const hygieneOnset = input.needs.hygiene <= 20 ? 0 : (input.needs.hygiene - 20) / Math.abs(NEED_RATES.hygiene);
  const energyAfterRest = clamp(input.needs.energy + restHours * 12);
  const energyOnset = energyAfterRest <= 20 ? restHours : restHours + (energyAfterRest - 20) / Math.abs(NEED_RATES.energy);
  const lowOnset = initiallyLow ? 0 : Math.min(fullnessOnset, hygieneOnset, energyOnset);
  const lowHours = low ? Math.max(0, hours - lowOnset) : 0;
  const lowNeedExposureHours = low ? lifecycle.lowNeedExposureHours + lowHours : 0;
  let healthCondition = lifecycle.healthCondition;
  const newlyIllHours = healthCondition === 'well' ? Math.max(0, lowNeedExposureHours - 6) : 0;
  if (healthCondition === 'well' && lowNeedExposureHours >= 6) healthCondition = 'ill';
  if (healthCondition === 'ill' && needs.fullness >= 40 && needs.energy >= 40 && needs.hygiene >= 40) healthCondition = 'well';
  if (healthCondition === 'ill') needs.health = clamp(needs.health - 5 * (lifecycle.healthCondition === 'ill' ? hours : newlyIllHours));
  else if (needs.fullness >= 40 && needs.energy >= 40 && needs.hygiene >= 40) needs.health = clamp(needs.health + 2 * hours);
  const protectedUntilMs = lifecycle.protectionUntil ? time(lifecycle.protectionUntil, 'Protection end') : 0;
  if (needs.health <= 0 && endMs < protectedUntilMs) needs.health = 1;
  const lifecycleEvents = [...(input.lifecycleEvents || [])];
  if (lifecycle.healthCondition !== healthCondition) lifecycleEvents.push({ id: idFactory(), kind: healthCondition === 'ill' ? 'illness' : 'recovery', at: new Date(healthCondition === 'ill' ? endMs - newlyIllHours * HOUR_MS : clockMs) });
  let state: StoredCompanion = { ...input, needs, lifecycleEvents: lifecycleEvents.slice(-200), behaviorState: restEndMs > nowMs ? 'resting' : 'active', restUntil: restEndMs > nowMs ? new Date(restEndMs) : null,
    lifecycle: { ...lifecycle, simulatedAgeHours: lifecycle.simulatedAgeHours + hours, lowNeedExposureHours, healthCondition, simulationAt: new Date(endMs) } };
  if (needs.health <= 0) state = { ...state, lifecycle: { ...state.lifecycle!, lifeStatus: 'deceased', terminalAt: new Date(endMs), terminalReason: 'illness' }, lifecycleEvents: [...(state.lifecycleEvents || []), { id: idFactory(), kind: 'death', reason: 'illness', at: new Date(endMs) } as CompanionLifecycleEvent].slice(-200) };
  return { state: advanceLifecycle(state, new Date(endMs), idFactory), automaticallyPaused: engagementDeadline < nowMs && endMs === engagementDeadline };
}

export function engageCompanion(input: StoredCompanion, now: Date, idFactory: () => string = randomUUID): StoredCompanion {
  const settled = simulateCompanion(input, now, idFactory);
  if (!settled.state.lifecycle || settled.state.lifecycle.lifeStatus !== 'alive') return settled.state;
  const lifecycle = settled.state.lifecycle;
  const protectionExpired = !lifecycle.protectionUntil || new Date(lifecycle.protectionUntil).getTime() <= now.getTime();
  const grantsProtection = settled.automaticallyPaused && protectionExpired;
  return { ...settled.state, lifecycle: { ...lifecycle, simulationAt: now, lastEngagementAt: now,
    protectionUntil: grantsProtection ? new Date(now.getTime() + RETURN_PROTECTION_HOURS * HOUR_MS) : lifecycle.protectionUntil },
    lifecycleEvents: grantsProtection ? [...(settled.state.lifecycleEvents || []), { id: idFactory(), kind: 'protection', at: now } as CompanionLifecycleEvent].slice(-200) : settled.state.lifecycleEvents };
}

function legacyState(input: any): StoredCompanion {
  if (input.lifecycle) return input;
  const at = input.simulatedAt || input.needsUpdatedAt || input.updatedAt || new Date(0);
  return { ...input, needs: { ...input.needs, hygiene: input.needs?.hygiene ?? input.hygiene ?? 100, health: input.needs?.health ?? input.health ?? 100 }, lifecycle: {
    rulesVersion: 3, lifeStatus: input.lifeStatus || 'alive', healthCondition: input.healthCondition || 'well', stage: input.stage || 'hatchling',
    simulatedAgeHours: input.simulatedAgeHours || 0, stageCareCount: input.stageCareCount || 0, lowNeedExposureHours: input.lowNeedExposureHours || 0,
    simulationAt: at, lastEngagementAt: input.lastEngagementAt || at, protectionUntil: input.protectionUntil || null, lastMedicineAt: input.lastMedicineAt || null,
    terminalAt: input.terminalAt || null, terminalReason: input.deathReason || null, generation: input.generation || 1, lineageId: input.lineageId || input._id, predecessorId: input.predecessorId || null,
  } } as StoredCompanion;
}

function legacyResult(input: any, result: SimulationResult) {
  const state: any = result.state;
  const lifecycle = state.lifecycle;
  const events = (state.lifecycleEvents || []).slice((input.lifecycleEvents || []).length).map((event: any) => ({
    type: event.kind === 'illness' ? 'illness_onset' : event.kind === 'recovery' ? 'illness_recovered' : event.kind === 'stage' ? 'stage_transition' : event.kind === 'death' ? 'death' : event.kind === 'protection' ? 'neglect_death_prevented' : event.kind,
    details: { reason: event.reason, stage: event.toStage },
  }));
  const restingFinished = input.behaviorState === 'resting' && state.behaviorState === 'active';
  if (restingFinished) events.push({ type: 'nap_finished', details: {} });
  if (input.protectionUntil && state.needs.health === 1 && (input.health || input.needs?.health || 0) > 1) events.push({ type: 'neglect_death_prevented', details: {} });
  return { state: { ...state, mood: restingFinished ? 'cozy' : state.mood, simulatedAt: lifecycle.simulationAt, lastEngagementAt: lifecycle.lastEngagementAt, simulatedAgeHours: lifecycle.simulatedAgeHours, stage: lifecycle.stage, stageCareCount: lifecycle.stageCareCount, lowNeedExposureHours: lifecycle.lowNeedExposureHours, lifeStatus: lifecycle.lifeStatus, healthCondition: lifecycle.healthCondition, deathReason: lifecycle.terminalReason, protectionUntil: lifecycle.protectionUntil, health: state.needs.health, hygiene: state.needs.hygiene }, events };
}

export function settleSimulation(input: any, now: Date) {
  const currentAt = new Date(input.simulatedAt || input.needsUpdatedAt || input.updatedAt || 0).getTime();
  if (now.getTime() <= currentAt) return { state: input, events: [] };
  return legacyResult(input, simulateCompanion(legacyState(input), now));
}

export function applyEngagement(input: any, now: Date) {
  const normalized = legacyState(input);
  const engaged = engageCompanion(normalized, now);
  return legacyResult(input, { state: engaged, automaticallyPaused: false }).state;
}
