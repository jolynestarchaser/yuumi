import type {
  StoredCompanion,
  CompanionGrowthStage,
  CompanionSpecies,
  CompanionEvolution,
  NextStageRequirement,
  CompanionSetup,
} from '../../../shared/contracts.js';
import {
  COMPANION_RULES_VERSION,
  STAGE_GATES,
} from './companionRules.js';

export function formIdFor(
  species: CompanionSpecies,
  stage: CompanionGrowthStage,
  branch: CompanionEvolution['path']
): string {
  return `${species}-${stage}-${branch}-v3`;
}

export function calculateNextStageRequirement(state: StoredCompanion): NextStageRequirement | null {
  const currentStage = state.stageOutcomes?.at(-1)?.stage || 'hatchling';
  const careCount = state.stageCareCount ?? 0;

  switch (currentStage) {
    case 'hatchling':
      return {
        minAgeDays: STAGE_GATES.child.minAgeDays,
        requiredCareCount: STAGE_GATES.child.requiredCareCount,
        currentCareCount: careCount,
      };
    case 'child':
      return {
        minAgeDays: STAGE_GATES.juvenile.minAgeDays,
        requiredCareCount: STAGE_GATES.juvenile.requiredCareCount,
        currentCareCount: careCount,
      };
    case 'juvenile':
      return {
        minAgeDays: STAGE_GATES.grown.minAgeDays,
        requiredCareCount: STAGE_GATES.grown.requiredCareCount,
        currentCareCount: careCount,
      };
    case 'grown':
      return {
        minAgeDays: STAGE_GATES.elder.minAgeDays,
        requiredCareCount: STAGE_GATES.elder.requiredCareCount,
        currentCareCount: careCount,
      };
    case 'elder':
      return {
        minAgeDays: STAGE_GATES.naturalDeath.minAgeDays,
        requiredCareCount: 0,
        currentCareCount: careCount,
      };
    default:
      return null;
  }
}

export function canRetire(state: StoredCompanion, expectedRevision: number): { allowed: boolean; reason?: string } {
  if (state.lifeStatus !== 'alive') {
    return { allowed: false, reason: 'Only living companions can retire.' };
  }
  const stage = state.stageOutcomes?.at(-1)?.stage || 'hatchling';
  if (stage !== 'elder') {
    return { allowed: false, reason: 'Only elder companions can retire.' };
  }
  if (expectedRevision !== state.revision) {
    return { allowed: false, reason: 'Your companion changed while you were confirming retirement. Please refresh.' };
  }
  return { allowed: true };
}

export function retireElder(state: StoredCompanion, expectedRevision: number, now = new Date()): StoredCompanion {
  const check = canRetire(state, expectedRevision);
  if (!check.allowed) {
    throw new Error(check.reason);
  }

  return {
    ...state,
    lifeStatus: 'retired',
    retiredAt: now,
    behaviorState: 'active',
    restUntil: null,
    careRequest: null,
    simulatedAt: now,
    needsUpdatedAt: now,
  };
}

export function createSuccessorState(
  predecessor: StoredCompanion,
  setup: CompanionSetup,
  id: string,
  now = new Date()
): StoredCompanion {
  if (predecessor.lifeStatus !== 'retired' && predecessor.lifeStatus !== 'deceased') {
    throw new Error('A successor can only be created for a retired or deceased companion.');
  }

  const generation = (predecessor.generation ?? 1) + 1;
  const lineageId = predecessor.lineageId || predecessor._id || 'lineage-primary';

  return {
    _id: id,
    familyId: predecessor.familyId || 'joe-and-focus',
    schemaVersion: 3,
    archivedAt: null,
    name: setup.name.trim(),
    form: setup.form,
    seed: setup.seed.trim(),
    inspirations: { joe: '', focus: '' },
    bornAt: now,
    updatedAt: now,
    needsUpdatedAt: now,
    simulatedAt: now,
    lastEngagementAt: now,
    protectionUntil: null,
    needs: { fullness: 75, energy: 80, joy: 75, comfort: 75, hygiene: 100 },
    health: 100,
    hygiene: 100,
    lifeStatus: 'alive',
    healthCondition: 'well',
    simulatedAgeHours: 0,
    lowNeedExposureHours: 0,
    stageCareCount: 0,
    lineageId,
    generation,
    predecessorId: predecessor._id || null,
    traits: {
      curiosity: setup.temperament === 'curious' ? 65 : 45,
      affection: setup.temperament === 'gentle' ? 65 : 45,
      playfulness: setup.temperament === 'playful' ? 65 : 45,
    },
    bonds: { joe: 0, focus: 0 },
    xp: 0,
    mood: 'curious',
    thought: 'A new chapter begins. I wonder what our story will be.',
    chatColor: predecessor.chatColor || '#cdb2ea',
    behaviorState: 'active',
    restUntil: null,
    careRequest: null,
    careSummary: { actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 }, caregivers: { joe: 0, focus: 0 } },
    behaviorWindow: [],
    stageOutcomes: [],
    appearance: setup.appearance || predecessor.appearance || { visualStyle: 'soft', animated: true, usePortrait: false },
    memories: [],
    turns: [],
    portrait: null,
    revision: 0,
  };
}
