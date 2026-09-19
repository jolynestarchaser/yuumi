import type {
  StoredCompanion,
  CompanionGrowthStage,
  LifeStatus,
  HealthCondition,
  CareAction,
  CompanionMood,
  CompanionStageOutcome,
} from '../../../shared/contracts.js';
import {
  COMPANION_RULES_VERSION,
  DECAY_RATES_PER_HOUR,
  HEALTH_ILLNESS_DRAIN_PER_HOUR,
  HEALTH_WELL_RECOVERY_PER_HOUR,
  LOW_NEED_THRESHOLD,
  RECOVERY_NEED_THRESHOLD,
  ILLNESS_EXPOSURE_HOURS,
  AUTO_PAUSE_HOURS,
  PROTECTION_WINDOW_HOURS,
  STAGE_GATES,
  clampStat,
} from './companionRules.js';

export type SimulationEventType =
  | 'nap_finished'
  | 'illness_onset'
  | 'illness_cleared'
  | 'health_recovered'
  | 'neglect_death_prevented'
  | 'stage_transition'
  | 'death';

export interface SimulationEvent {
  type: SimulationEventType;
  at: Date;
  details?: Record<string, unknown>;
}

export interface SimulationResult {
  state: StoredCompanion;
  events: SimulationEvent[];
}

function dateOrNull(val: unknown): Date | null {
  if (!val) return null;
  const d = new Date(val as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeAllowedActions(state: StoredCompanion): string[] {
  if (!state.bornAt) return ['adopt'];
  if (state.archivedAt) return ['restore'];
  if (state.lifeStatus === 'deceased' || state.lifeStatus === 'retired') {
    return ['forget'];
  }
  const actions: string[] = ['feed', 'play', 'cuddle', 'rest', 'explore', 'clean', 'chat', 'chatColor', 'appearance', 'customize', 'inspiration', 'forget', 'archive', 'visit'];
  if (state.healthCondition === 'ill') {
    actions.push('medicine');
  }
  const currentStage = state.stageOutcomes?.at(-1)?.stage || 'hatchling';
  if (currentStage === 'elder') {
    actions.push('retire');
  }
  return actions;
}

/**
 * Pure piecewise simulation engine.
 * Calculates exact state progression up to min(now, lastEngagement + 24h).
 */
export function settleSimulation(state: StoredCompanion, now: Date): SimulationResult {
  const events: SimulationEvent[] = [];
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) {
    return { state, events };
  }

  // Clocks and timestamps
  const lastSimulatedMs = new Date(
    state.simulatedAt || state.needsUpdatedAt || state.updatedAt || now
  ).getTime();

  if (nowMs <= lastSimulatedMs) {
    return { state, events };
  }

  // If archived, retired, deceased, or truly unhatched (egg), do not advance simulation.
  const isTrulyUnhatched = state.bornAt === null && !state.stageOutcomes?.length && (state.xp || 0) === 0 && (!state.bonds?.joe && !state.bonds?.focus);
  if (isTrulyUnhatched || state.archivedAt != null || state.lifeStatus === 'retired' || state.lifeStatus === 'deceased') {
    return { state, events };
  }

  // Engagement deadline: 24 hours of simulated time from last qualifying engagement
  const lastEngagementMs = new Date(
    state.lastEngagementAt || state.bornAt || lastSimulatedMs
  ).getTime();
  const pauseDeadlineMs = lastEngagementMs + AUTO_PAUSE_HOURS * 3600 * 1000;
  const targetEndMs = Math.min(nowMs, pauseDeadlineMs);

  if (targetEndMs <= lastSimulatedMs) {
    return { state, events };
  }

  // Mutable copy of values for piecewise stepping
  let currentMs = lastSimulatedMs;
  let fullness = state.needs.fullness;
  let energy = state.needs.energy;
  let joy = state.needs.joy;
  let comfort = state.needs.comfort ?? 75;
  let hygiene = state.needs.hygiene ?? 100;
  let health = state.health ?? 100;
  let healthCondition: HealthCondition = state.healthCondition || (health < 100 && (fullness < 20 || energy < 20 || hygiene < 20) ? 'ill' : 'well');
  let lowNeedExposureHours = state.lowNeedExposureHours ?? 0;
  let simulatedAgeHours = state.simulatedAgeHours ?? 0;
  let stageCareCount = state.stageCareCount ?? 0;
  let behaviorState: 'active' | 'resting' = state.behaviorState || 'active';
  let restUntil = dateOrNull(state.restUntil);
  let mood: CompanionMood = state.mood || 'curious';
  let lifeStatus: LifeStatus = state.lifeStatus || 'alive';
  let deceasedAt: Date | null = dateOrNull(state.deceasedAt);
  let deathReason: 'natural' | 'illness' | null = state.deathReason || null;
  const protectionUntil = dateOrNull(state.protectionUntil);
  const stageOutcomes = [...(state.stageOutcomes || [])];
  let currentStage: CompanionGrowthStage = stageOutcomes.at(-1)?.stage || 'hatchling';

  // Helper to check if any of the three critical needs is < 20
  const isAnyLow = (f: number, e: number, h: number) => f < LOW_NEED_THRESHOLD || e < LOW_NEED_THRESHOLD || h < LOW_NEED_THRESHOLD;
  // Helper to check if all three critical needs are >= 40
  const areAllRecovered = (f: number, e: number, h: number) => f >= RECOVERY_NEED_THRESHOLD && e >= RECOVERY_NEED_THRESHOLD && h >= RECOVERY_NEED_THRESHOLD;

  const EPSILON = 1e-6;

  while (currentMs < targetEndMs && lifeStatus === 'alive') {
    const isResting = behaviorState === 'resting' && restUntil != null && restUntil.getTime() > currentMs;
    const restEndMs = isResting && restUntil ? restUntil.getTime() : Infinity;

    // Rates per millisecond
    const rFullness = -DECAY_RATES_PER_HOUR.fullness / 3600000;
    const rEnergy = (isResting ? -DECAY_RATES_PER_HOUR.energyResting : -DECAY_RATES_PER_HOUR.energyAwake) / 3600000;
    const rJoy = -DECAY_RATES_PER_HOUR.joy / 3600000;
    const rComfort = -DECAY_RATES_PER_HOUR.comfort / 3600000;
    const rHygiene = -DECAY_RATES_PER_HOUR.hygiene / 3600000;
    const rAge = 1 / 3600000;

    const anyLow = isAnyLow(fullness, energy, hygiene);
    const allRecovered = areAllRecovered(fullness, energy, hygiene);

    let rHealth = 0;
    if (healthCondition === 'ill') {
      rHealth = -HEALTH_ILLNESS_DRAIN_PER_HOUR / 3600000;
    } else if (allRecovered && health < 100) {
      rHealth = HEALTH_WELL_RECOVERY_PER_HOUR / 3600000;
    }

    // Determine candidate event times (dt in ms)
    let dt = targetEndMs - currentMs;

    // 1. Rest finish
    if (isResting && restEndMs > currentMs && restEndMs - currentMs < dt) {
      dt = restEndMs - currentMs;
    }

    // 2. Need threshold crossings (reaching 20 downwards, or reaching 20 upwards, or reaching 40 upwards)
    // Fullness crossing 20
    if (rFullness < 0 && fullness > LOW_NEED_THRESHOLD) {
      const t = (LOW_NEED_THRESHOLD - fullness) / rFullness;
      if (t > EPSILON && t < dt) dt = t;
    }
    // Energy crossing 20 downwards
    if (rEnergy < 0 && energy > LOW_NEED_THRESHOLD) {
      const t = (LOW_NEED_THRESHOLD - energy) / rEnergy;
      if (t > EPSILON && t < dt) dt = t;
    }
    // Energy crossing 20 upwards (while resting)
    if (rEnergy > 0 && energy < LOW_NEED_THRESHOLD) {
      const t = (LOW_NEED_THRESHOLD - energy) / rEnergy;
      if (t > EPSILON && t < dt) dt = t;
    }
    // Energy crossing 40 upwards (while resting)
    if (rEnergy > 0 && energy < RECOVERY_NEED_THRESHOLD) {
      const t = (RECOVERY_NEED_THRESHOLD - energy) / rEnergy;
      if (t > EPSILON && t < dt) dt = t;
    }
    // Hygiene crossing 20 downwards
    if (rHygiene < 0 && hygiene > LOW_NEED_THRESHOLD) {
      const t = (LOW_NEED_THRESHOLD - hygiene) / rHygiene;
      if (t > EPSILON && t < dt) dt = t;
    }

    // 3. Low need exposure reaching 6 hours (illness onset)
    if (healthCondition === 'well' && anyLow) {
      const remainingExposureHours = ILLNESS_EXPOSURE_HOURS - lowNeedExposureHours;
      if (remainingExposureHours > 0) {
        const t = remainingExposureHours * 3600000;
        if (t > EPSILON && t < dt) dt = t;
      }
    }

    // 4. Health reaching 0 (death) or 100 (full recovery)
    if (rHealth < 0 && health > 0) {
      const t = (0 - health) / rHealth;
      if (t > EPSILON && t < dt) dt = t;
    } else if (rHealth > 0 && health < 100) {
      const t = (100 - health) / rHealth;
      if (t > EPSILON && t < dt) dt = t;
    }

    // 5. Age reaching next life stage boundary or natural death
    if (currentStage === 'hatchling') {
      const rem = (STAGE_GATES.child.minAgeHours - simulatedAgeHours) * 3600000;
      if (rem > EPSILON && rem < dt) dt = rem;
    } else if (currentStage === 'child') {
      const rem = (STAGE_GATES.juvenile.minAgeHours - simulatedAgeHours) * 3600000;
      if (rem > EPSILON && rem < dt) dt = rem;
    } else if (currentStage === 'juvenile') {
      const rem = (STAGE_GATES.grown.minAgeHours - simulatedAgeHours) * 3600000;
      if (rem > EPSILON && rem < dt) dt = rem;
    }
    // Elder boundary at 60 days
    if (currentStage !== 'elder' && simulatedAgeHours < STAGE_GATES.elder.minAgeHours) {
      const rem = (STAGE_GATES.elder.minAgeHours - simulatedAgeHours) * 3600000;
      if (rem > EPSILON && rem < dt) dt = rem;
    }
    // Natural death boundary at 90 days
    if (simulatedAgeHours < STAGE_GATES.naturalDeath.minAgeHours) {
      const rem = (STAGE_GATES.naturalDeath.minAgeHours - simulatedAgeHours) * 3600000;
      if (rem > EPSILON && rem < dt) dt = rem;
    }

    // 6. Protection window expiration
    if (protectionUntil && protectionUntil.getTime() > currentMs && protectionUntil.getTime() - currentMs < dt) {
      dt = protectionUntil.getTime() - currentMs;
    }

    // Advance state by dt
    const stepHours = dt / 3600000;
    fullness = clampStat(fullness + rFullness * dt);
    energy = clampStat(energy + rEnergy * dt);
    joy = clampStat(joy + rJoy * dt);
    comfort = clampStat(comfort + rComfort * dt);
    hygiene = clampStat(hygiene + rHygiene * dt);
    simulatedAgeHours += stepHours;
    currentMs += dt;
    const stepDate = new Date(currentMs);

    // Update low need exposure
    if (isAnyLow(fullness, energy, hygiene)) {
      lowNeedExposureHours += stepHours;
    } else {
      lowNeedExposureHours = 0;
    }

    // Update health
    if (rHealth !== 0) {
      health = clampStat(health + rHealth * dt);
    }

    // Event: Rest ends
    if (isResting && restUntil && currentMs >= restUntil.getTime()) {
      behaviorState = 'active';
      restUntil = null;
      mood = 'cozy';
      events.push({ type: 'nap_finished', at: stepDate });
    }

    // Event: Illness onset (after 6 continuous hours of low need)
    if (healthCondition === 'well' && lowNeedExposureHours >= ILLNESS_EXPOSURE_HOURS) {
      healthCondition = 'ill';
      events.push({ type: 'illness_onset', at: stepDate });
    }

    // Event: Illness cleared (when all three needs are >= 40)
    if (healthCondition === 'ill' && areAllRecovered(fullness, energy, hygiene)) {
      healthCondition = 'well';
      events.push({ type: 'illness_cleared', at: stepDate });
    }

    // Health full recovery
    if (healthCondition === 'well' && health >= 100 && rHealth > 0) {
      events.push({ type: 'health_recovered', at: stepDate });
    }

    // Check Neglect Death vs Protection
    if (health <= 0) {
      const isProtected = protectionUntil != null && protectionUntil.getTime() > currentMs;
      if (isProtected) {
        health = 1.0;
        events.push({ type: 'neglect_death_prevented', at: stepDate });
      } else {
        lifeStatus = 'deceased';
        deathReason = 'illness';
        deceasedAt = stepDate;
        health = 0;
        events.push({ type: 'death', at: stepDate, details: { reason: 'illness' } });
        break; // Stop integration at death
      }
    }

    // Check Natural Death at 90 days
    if (simulatedAgeHours >= STAGE_GATES.naturalDeath.minAgeHours) {
      lifeStatus = 'deceased';
      deathReason = 'natural';
      deceasedAt = stepDate;
      events.push({ type: 'death', at: stepDate, details: { reason: 'natural' } });
      break; // Stop integration at death
    }

    // Check Stage Transitions
    // Check elder stage (age alone at 60 days)
    if (currentStage !== 'elder' && simulatedAgeHours >= STAGE_GATES.elder.minAgeHours) {
      const branch = stageOutcomes.at(-1)?.branch || 'guardian';
      const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
      const fromFormId = stageOutcomes.at(-1)?.toFormId || `${species}-${currentStage}-${branch}-v2`;
      const toFormId = `${species}-elder-${branch}-v3`;
      currentStage = 'elder';
      stageCareCount = 0;
      stageOutcomes.push({
        id: `stage-${simulatedAgeHours.toFixed(0)}-elder`,
        level: Math.floor(state.xp / 80) + 1,
        stage: 'elder',
        fromFormId,
        toFormId,
        branch,
        rulesVersion: COMPANION_RULES_VERSION,
        at: stepDate,
      });
      events.push({ type: 'stage_transition', at: stepDate, details: { stage: 'elder' } });
    } else if (currentStage === 'hatchling' && simulatedAgeHours >= STAGE_GATES.child.minAgeHours && stageCareCount >= STAGE_GATES.child.requiredCareCount) {
      const branch = stageOutcomes.at(-1)?.branch || 'guardian';
      const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
      const fromFormId = `${species}-hatchling-${branch}-v2`;
      const toFormId = `${species}-child-${branch}-v3`;
      currentStage = 'child';
      stageCareCount = 0;
      stageOutcomes.push({
        id: `stage-${simulatedAgeHours.toFixed(0)}-child`,
        level: Math.floor(state.xp / 80) + 1,
        stage: 'child',
        fromFormId,
        toFormId,
        branch,
        rulesVersion: COMPANION_RULES_VERSION,
        at: stepDate,
      });
      events.push({ type: 'stage_transition', at: stepDate, details: { stage: 'child' } });
    } else if (currentStage === 'child' && simulatedAgeHours >= STAGE_GATES.juvenile.minAgeHours && stageCareCount >= STAGE_GATES.juvenile.requiredCareCount) {
      const branch = stageOutcomes.at(-1)?.branch || 'guardian';
      const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
      const fromFormId = stageOutcomes.at(-1)?.toFormId || `${species}-child-${branch}-v3`;
      const toFormId = `${species}-juvenile-${branch}-v3`;
      currentStage = 'juvenile';
      stageCareCount = 0;
      stageOutcomes.push({
        id: `stage-${simulatedAgeHours.toFixed(0)}-juvenile`,
        level: Math.floor(state.xp / 80) + 1,
        stage: 'juvenile',
        fromFormId,
        toFormId,
        branch,
        rulesVersion: COMPANION_RULES_VERSION,
        at: stepDate,
      });
      events.push({ type: 'stage_transition', at: stepDate, details: { stage: 'juvenile' } });
    } else if (currentStage === 'juvenile' && simulatedAgeHours >= STAGE_GATES.grown.minAgeHours && stageCareCount >= STAGE_GATES.grown.requiredCareCount) {
      const branch = stageOutcomes.at(-1)?.branch || 'guardian';
      const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
      const fromFormId = stageOutcomes.at(-1)?.toFormId || `${species}-juvenile-${branch}-v3`;
      const toFormId = `${species}-grown-${branch}-v3`;
      currentStage = 'grown';
      stageCareCount = 0;
      stageOutcomes.push({
        id: `stage-${simulatedAgeHours.toFixed(0)}-grown`,
        level: Math.floor(state.xp / 80) + 1,
        stage: 'grown',
        fromFormId,
        toFormId,
        branch,
        rulesVersion: COMPANION_RULES_VERSION,
        at: stepDate,
      });
      events.push({ type: 'stage_transition', at: stepDate, details: { stage: 'grown' } });
    }
  }

  const updatedSimulatedAt = new Date(currentMs);

  const nextState: StoredCompanion = {
    ...state,
    simulatedAt: updatedSimulatedAt,
    needsUpdatedAt: updatedSimulatedAt,
    needs: {
      fullness,
      energy,
      joy,
      comfort,
      hygiene,
    },
    health,
    hygiene,
    healthCondition,
    lowNeedExposureHours,
    simulatedAgeHours,
    stageCareCount,
    behaviorState,
    restUntil,
    mood,
    lifeStatus,
    deathReason,
    deceasedAt,
    stageOutcomes,
  };

  return { state: nextState, events };
}

/**
 * Applies explicit user engagement (visit, accepted care, saved chat).
 * Settle first to the 24-hr deadline. If paused, discard unsimulated gap and grant 24-hr protection window.
 */
export function applyEngagement(state: StoredCompanion, now: Date): StoredCompanion {
  // Settle simulation up to now (capped automatically by lastEngagement + 24h inside settleSimulation)
  const settled = settleSimulation(state, now);
  let next = settled.state;

  if (next.lifeStatus === 'deceased' || next.lifeStatus === 'retired' || !next.bornAt) {
    return next;
  }

  const lastEngMs = new Date(
    state.lastEngagementAt || state.bornAt || now
  ).getTime();
  const pauseThresholdMs = lastEngMs + AUTO_PAUSE_HOURS * 3600 * 1000;
  const wasPaused = now.getTime() > pauseThresholdMs;

  let protectionUntil = dateOrNull(next.protectionUntil);

  if (wasPaused) {
    // Grant protection for 24 hours if not already active or if expired
    const activeProtectionMs = protectionUntil ? protectionUntil.getTime() : 0;
    if (activeProtectionMs < now.getTime()) {
      protectionUntil = new Date(now.getTime() + PROTECTION_WINDOW_HOURS * 3600 * 1000);
    }
  }

  next = {
    ...next,
    lastEngagementAt: now,
    protectionUntil,
    simulatedAt: now,
    needsUpdatedAt: now,
  };

  return next;
}
