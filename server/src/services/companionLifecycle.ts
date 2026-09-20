import { randomUUID } from 'node:crypto';
import { ELDER_HOURS, NATURAL_DEATH_HOURS, STAGE_GATES } from './companionRules.js';
import type { CompanionGrowthStage, CompanionLifecycleEvent, StoredCompanion } from '../../../shared/contracts.js';

const order: CompanionGrowthStage[] = ['hatchling', 'child', 'juvenile', 'grown', 'elder'];
const branchFor = (state: StoredCompanion): 'explorer' | 'guardian' | 'trickster' => {
  const actions = state.careSummary?.actions;
  if (!actions) return 'guardian';
  if (actions.explore > actions.play && actions.explore > actions.cuddle) return 'explorer';
  if (actions.play > actions.explore && actions.play > actions.cuddle) return 'trickster';
  return 'guardian';
};
const formFor = (state: StoredCompanion, stage: CompanionGrowthStage, branch: 'explorer' | 'guardian' | 'trickster') => {
  const species = state.appearance?.species || (state.form === 'child' ? 'child' : state.form === 'pet' ? 'bunny' : 'spirit');
  return `${species}-${stage}-${branch}-v3`;
};

export function advanceLifecycle(state: StoredCompanion, now: Date, idFactory: () => string = randomUUID): StoredCompanion {
  const lifecycle = state.lifecycle;
  if (!lifecycle || lifecycle.lifeStatus !== 'alive') return state;
  if (lifecycle.simulatedAgeHours >= NATURAL_DEATH_HOURS) return { ...state, lifecycle: { ...lifecycle, lifeStatus: 'deceased', terminalAt: now, terminalReason: 'natural' }, lifecycleEvents: [...(state.lifecycleEvents || []), { id: idFactory(), kind: 'death', reason: 'natural', at: now } as CompanionLifecycleEvent].slice(-200) };
  let stage = lifecycle.stage;
  let stageCareCount = lifecycle.stageCareCount;
  if (lifecycle.simulatedAgeHours >= ELDER_HOURS && stage !== 'elder') {
    const branch = state.stageOutcomes?.at(-1)?.branch || branchFor(state);
    state = { ...state, stageOutcomes: [...(state.stageOutcomes || []), { id: idFactory(), level: Math.floor(state.xp / 80) + 1, stage: 'elder', fromFormId: state.stageOutcomes?.at(-1)?.toFormId || formFor(state, stage, branch), toFormId: formFor(state, 'elder', branch), branch, rulesVersion: 3, at: now }], lifecycleEvents: [...(state.lifecycleEvents || []), { id: idFactory(), kind: 'stage', fromStage: stage, toStage: 'elder', at: now } as CompanionLifecycleEvent].slice(-200) };
    return { ...state, lifecycle: { ...lifecycle, stage: 'elder', stageCareCount: 0 } };
  }
  for (const gate of STAGE_GATES) {
    if (gate.stage === 'elder') continue;
    if (order.indexOf(gate.stage) <= order.indexOf(stage)) continue;
    const eligible = lifecycle.simulatedAgeHours >= gate.ageHours && stageCareCount >= gate.care;
    if (!eligible) break;
    const previous = stage;
    stage = gate.stage;
    stageCareCount = 0;
    const branch = branchFor(state);
    state = { ...state, stageOutcomes: [...(state.stageOutcomes || []), { id: idFactory(), level: Math.floor(state.xp / 80) + 1, stage, fromFormId: state.stageOutcomes?.at(-1)?.toFormId || formFor(state, previous, branch), toFormId: formFor(state, stage, branch), branch, rulesVersion: 3, at: now }], lifecycleEvents: [...(state.lifecycleEvents || []), { id: idFactory(), kind: 'stage', fromStage: previous, toStage: stage, at: now } as CompanionLifecycleEvent].slice(-200) };
  }
  return { ...state, lifecycle: { ...lifecycle, stage, stageCareCount } };
}

export function retireCompanion(state: StoredCompanion, now: Date, idFactory: () => string = randomUUID): StoredCompanion {
  if (!state.lifecycle || state.lifecycle.lifeStatus !== 'alive' || state.lifecycle.stage !== 'elder') throw Object.assign(new Error('Only a living elder companion can retire.'), { status: 409 });
  return { ...state, lifecycle: { ...state.lifecycle, lifeStatus: 'retired', terminalAt: now, terminalReason: 'retired' }, lifecycleEvents: [...(state.lifecycleEvents || []), { id: idFactory(), kind: 'retirement', reason: 'retired', at: now } as CompanionLifecycleEvent].slice(-200) };
}
