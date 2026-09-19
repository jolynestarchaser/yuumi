import { randomUUID } from 'node:crypto';
import type {
  StoredCompanion,
  PublicCompanion,
  Profile,
  CompanionMood,
  CareAction,
  CompanionSetup,
  Temperament,
  CompanionGrowthStage,
  CompanionState,
  CompanionRequest,
} from '../../../shared/contracts.js';
import {
  COMPANION_RULES_VERSION,
  COMPANION_FAMILY_ID as RULES_FAMILY_ID,
  COMPANION_KEY as RULES_COMPANION_KEY,
  ALL_CARE_ACTIONS,
  ALL_MOODS,
  CARE_EFFECTS,
  AUTO_PAUSE_HOURS,
  clampStat,
} from './companionRules.js';
import { settleSimulation, computeAllowedActions } from './companionSimulation.js';
import { evaluateCareReward, addSafeXp, isMedicineEligible } from './companionRewards.js';
import { calculateNextStageRequirement, formIdFor } from './companionLifecycle.js';

export const COMPANION_KEY = RULES_COMPANION_KEY;
export const COMPANION_FAMILY_ID = RULES_FAMILY_ID;
export const COMPANION_SCHEMA_VERSION = COMPANION_RULES_VERSION;
export const ACTIONS = ALL_CARE_ACTIONS;
export const MOODS = ALL_MOODS;

export const displayName = (actor: Profile) => actor === 'joe' ? 'Joe' : 'Focus';

export const growthStageForLevel = (level: number): CompanionGrowthStage =>
  level < 3 ? 'hatchling' : level < 6 ? 'child' : level < 10 ? 'juvenile' : 'grown';

const emptyCareSummary = () => ({
  actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 },
  caregivers: { joe: 0, focus: 0 }
});

export function initialCompanion(): StoredCompanion {
  const now = new Date();
  return {
    _id: COMPANION_KEY,
    familyId: COMPANION_FAMILY_ID,
    schemaVersion: COMPANION_SCHEMA_VERSION,
    archivedAt: null,
    name: 'Mochi',
    form: 'creature',
    seed: 'A round little forest spirit with leaf ears, soft lavender fur, and a curious smile.',
    inspirations: { joe: '', focus: '' },
    bornAt: null,
    updatedAt: now,
    needsUpdatedAt: now,
    simulatedAt: null,
    lastEngagementAt: null,
    protectionUntil: null,
    needs: { fullness: 75, energy: 80, joy: 75, comfort: 75, hygiene: 100 },
    health: 100,
    hygiene: 100,
    lifeStatus: 'alive',
    healthCondition: 'well',
    simulatedAgeHours: 0,
    lowNeedExposureHours: 0,
    stageCareCount: 0,
    lineageId: 'lineage-primary',
    generation: 1,
    predecessorId: null,
    deceasedAt: null,
    deathReason: null,
    retiredAt: null,
    lastMedicineAt: null,
    traits: { curiosity: 50, affection: 50, playfulness: 50 },
    bonds: { joe: 0, focus: 0 },
    xp: 0,
    mood: 'curious',
    thought: 'I wonder what our first little adventure will be.',
    chatColor: '#cdb2ea',
    behaviorState: 'active',
    restUntil: null,
    careRequest: null,
    careSummary: emptyCareSummary(),
    behaviorWindow: [],
    stageOutcomes: [],
    appearance: { visualStyle: 'soft', animated: true, usePortrait: false },
    memories: [],
    turns: [],
    portrait: null,
    revision: 0
  };
}

export function settledState(state: StoredCompanion, now = new Date()): StoredCompanion {
  const result = settleSimulation(state, now);
  return {
    ...result.state,
    appearance: result.state.appearance || { visualStyle: 'soft', animated: true, usePortrait: false },
  };
}

export function refreshCareRequest(state: StoredCompanion, now = new Date()): StoredCompanion {
  const next = settledState(state, now);
  if (next.lifeStatus === 'deceased' || next.lifeStatus === 'retired') {
    next.careRequest = null;
    return next;
  }

  // Check if medicine is urgent
  if (next.healthCondition === 'ill' && isMedicineEligible(next, now).eligible) {
    if (next.careRequest?.state === 'active' && next.careRequest.action === 'medicine') {
      return next;
    }
    next.careRequest = { id: randomUUID(), action: 'medicine', state: 'active', createdAt: now };
    return next;
  }

  const current = next.careRequest;
  const value = (action: CareAction) => {
    switch (action) {
      case 'feed': return next.needs.fullness;
      case 'play': return next.needs.joy;
      case 'cuddle': return next.needs.comfort ?? 75;
      case 'rest': return next.needs.energy;
      case 'clean': return next.needs.hygiene ?? 100;
      case 'medicine': return next.health ?? 100;
      default: return next.needs.joy;
    }
  };

  // Hysteresis: keep active care request if need is still below 60
  if (current?.state === 'active' && current.action !== 'medicine' && value(current.action) < 60) {
    return next;
  }
  if (current?.state === 'active') {
    next.careRequest = { ...current, state: 'resolved', fulfilledAt: now };
  }

  const candidates: [CareAction, number][] = [
    ['feed', next.needs.fullness],
    ['play', next.needs.joy],
    ['rest', next.needs.energy],
    ['cuddle', next.needs.comfort ?? 75],
    ['clean', next.needs.hygiene ?? 100],
  ];

  const urgent = candidates.filter(([, score]) => score < 45).sort((a, b) => a[1] - b[1])[0];
  if (urgent) {
    next.careRequest = { id: randomUUID(), action: urgent[0], state: 'active', createdAt: now };
  }
  return next;
}

export function remember(
  state: StoredCompanion,
  actor: Profile,
  kind: string,
  text: string,
  now = new Date(),
  id: string = randomUUID()
): StoredCompanion {
  return { ...state, memories: [...state.memories, { id, actor, kind, text, at: now }].slice(-80) };
}

export function careFor(state: StoredCompanion, actor: Profile, action: CareAction, now = new Date()): StoredCompanion {
  if (!ACTIONS.includes(action) || !['joe', 'focus'].includes(actor)) {
    throw new Error('Invalid care action.');
  }
  if (state.lifeStatus === 'deceased' || state.lifeStatus === 'retired') {
    throw new Error('Cannot perform care actions on a terminal companion.');
  }

  const next = settledState(state, now);
  const reward = evaluateCareReward(next, action, now);
  if (action === 'medicine' && !reward.isMeaningfulCare && reward.reason) {
    throw new Error(reward.reason);
  }

  next.traits = { ...next.traits };
  next.bonds = { ...next.bonds, [actor]: (next.bonds[actor] || 0) + 1 };
  const person = displayName(actor);

  const careThoughts: Record<CareAction, string> = {
    feed: `${person} brought me a snack. I saved a tiny imaginary bite for later.`,
    play: `We invented a game! I think ${person} let me win the last round.`,
    cuddle: `A little cuddle with ${person}. My favorite place is somewhere cozy.`,
    rest: `${person} tucked me in. Tonight I might dream about floating islands.`,
    explore: `I explored with ${person} and found a pebble that looks like a moon!`,
    clean: `${person} helped me get squeaky clean. Fresh and bright!`,
    medicine: `${person} gave me medicine. Resting quietly until I feel better.`,
  };

  const effect = CARE_EFFECTS[action];
  next.needs = {
    fullness: clampStat(next.needs.fullness + effect.fullness),
    energy: clampStat(next.needs.energy + effect.energy),
    joy: clampStat(next.needs.joy + effect.joy),
    comfort: clampStat((next.needs.comfort ?? 75) + effect.comfort),
    hygiene: clampStat((next.needs.hygiene ?? 100) + effect.hygiene),
  };
  next.hygiene = next.needs.hygiene;

  if (action === 'medicine') {
    next.health = clampStat((next.health ?? 100) + effect.health);
    next.lastMedicineAt = now;
  }

  next.traits[effect.trait] = clampStat(next.traits[effect.trait] + 2);
  next.mood = effect.mood;
  next.thought = careThoughts[action];

  if (action === 'rest') {
    next.behaviorState = 'resting';
    next.restUntil = new Date(now.getTime() + 45 * 60_000);
  }

  // Update XP (unlimited, no daily cap)
  next.xp = addSafeXp(next.xp, reward.earnedXp);

  // If meaningful care: advance stage care count and behavior window
  if (reward.isMeaningfulCare) {
    next.stageCareCount = (next.stageCareCount ?? 0) + 1;
    next.behaviorWindow = [...(next.behaviorWindow || []), { action, actor, at: now }].slice(-24);
  }

  // If request fulfilled: mark it
  if (reward.isRequestFulfilled && next.careRequest) {
    next.careRequest = {
      ...next.careRequest,
      state: 'fulfilled',
      fulfilledAt: now,
      fulfilledBy: actor,
    };
  }

  const summary = next.careSummary || emptyCareSummary();
  next.careSummary = {
    actions: {
      ...summary.actions,
      [action]: ((summary.actions as Record<string, number>)[action] || 0) + 1,
    },
    caregivers: {
      ...summary.caregivers,
      [actor]: (summary.caregivers[actor] || 0) + 1,
    },
  };

  // Register engagement and update timestamps
  next.lastEngagementAt = now;
  next.simulatedAt = now;
  next.needsUpdatedAt = now;
  next.updatedAt = now;

  const dayKey = now.toISOString().slice(0, 10);
  next.xpBudget = {
    day: dayKey,
    care: ((next.xpBudget?.day === dayKey ? next.xpBudget.care : 0) + reward.earnedXp),
    chat: (next.xpBudget?.day === dayKey ? next.xpBudget.chat : 0),
  };

  return refreshCareRequest(
    remember(next, actor, action, `${person} chose to ${action} with me.`, now),
    now
  );
}

export function forgetMemory(state: StoredCompanion, id: string): StoredCompanion {
  return {
    ...state,
    memories: state.memories.filter((memory) => memory.id !== id),
    turns: [],
    thought: 'Ready for a new little adventure.',
  };
}

export function validateSetup(body: Partial<CompanionSetup>) {
  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
  return Boolean(
    body &&
    text(body.name, 32) &&
    ['pet', 'child', 'creature'].includes(body.form as string) &&
    text(body.seed, 500) &&
    ['curious', 'gentle', 'playful'].includes(body.temperament as string) &&
    (body.appearance === undefined || validateAppearance(body.appearance))
  );
}

export function validateAppearance(value: unknown): value is import('../../../shared/contracts.js').CompanionAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const appearance = value as Record<string, unknown>;
  const color = (entry: unknown) => entry === undefined || (typeof entry === 'string' && /^#[0-9a-fA-F]{6}$/.test(entry));
  const voice = appearance.voice as Record<string, unknown> | undefined;
  const validVoice = voice === undefined || (voice && typeof voice === 'object' && !Array.isArray(voice)
    && typeof voice.enabled === 'boolean' && ['th-TH', 'en-US'].includes(voice.language as string)
    && typeof voice.voiceURI === 'string' && voice.voiceURI.length <= 300
    && typeof voice.rate === 'number' && voice.rate >= .5 && voice.rate <= 1.5
    && typeof voice.pitch === 'number' && voice.pitch >= .5 && voice.pitch <= 2
    && (voice.preset === undefined || ['natural', 'spark', 'fairy', 'dragon', 'robot', 'custom'].includes(voice.preset as string))
    && Object.keys(voice).every((key) => ['enabled', 'language', 'voiceURI', 'rate', 'pitch', 'preset'].includes(key)));
  return Boolean(['soft', 'pixel'].includes(appearance.visualStyle as string)
    && typeof appearance.animated === 'boolean' && typeof appearance.usePortrait === 'boolean'
    && (appearance.species === undefined || ['spirit', 'bunny', 'cat', 'fox', 'dragon', 'robot', 'child', 'custom'].includes(appearance.species as string))
    && color(appearance.bodyColor) && color(appearance.accentColor) && color(appearance.eyeColor) && validVoice
    && (appearance.customDescription === undefined || (typeof appearance.customDescription === 'string' && appearance.customDescription.length <= 500))
    && (appearance.species !== 'custom' || (typeof appearance.customDescription === 'string' && appearance.customDescription.trim().length > 0))
    && (appearance.face === undefined || ['gentle', 'happy', 'sleepy', 'mischievous', 'starry'].includes(appearance.face as string))
    && (appearance.gender === undefined || ['unspecified', 'female', 'male', 'nonbinary'].includes(appearance.gender as string))
    && (appearance.theme === undefined || ['lavender', 'forest', 'ocean', 'sunset', 'starlight', 'candy', 'custom'].includes(appearance.theme as string))
    && (appearance.silhouette === undefined || ['round', 'bean', 'fluffy'].includes(appearance.silhouette as string))
    && Object.keys(appearance).every((key) => ['visualStyle', 'animated', 'usePortrait', 'species', 'bodyColor', 'accentColor', 'eyeColor', 'voice', 'customDescription', 'face', 'gender', 'theme', 'silhouette'].includes(key)));
}

export function startingTraits(temperament: Temperament) {
  return {
    curiosity: temperament === 'curious' ? 65 : 45,
    affection: temperament === 'gentle' ? 65 : 45,
    playfulness: temperament === 'playful' ? 65 : 45
  };
}

export function publicCompanion(state: StoredCompanion, now = new Date()): PublicCompanion {
  const settled = settledState(state, now);
  const {
    _id,
    __v,
    lockToken,
    lockedUntil,
    budget,
    lastCare,
    recentOperations,
    familyId,
    schemaVersion,
    needsUpdatedAt,
    createdOperationId,
    simulatedAt,
    lastMedicineAt,
    ...safe
  } = settled;

  const needs = {
    fullness: Math.round(safe.needs.fullness),
    energy: Math.round(safe.needs.energy),
    joy: Math.round(safe.needs.joy),
    comfort: Math.round(safe.needs.comfort ?? 75),
    hygiene: Math.round(safe.needs.hygiene ?? 100),
  };

  const level = Math.floor(safe.xp / 80) + 1;
  const wishes = [
    'Show me something that made you smile today.',
    'Could we make up a tiny adventure together?',
    'Tell me a song you love. I want to imagine its colors.',
    'What should we name our imaginary moon garden?'
  ];

  const currentOutcome = safe.stageOutcomes?.at(-1);
  const lifecycleStage = currentOutcome?.stage || growthStageForLevel(level);
  const growthStage = lifecycleStage;
  const species = safe.appearance?.species || (safe.form === 'child' ? 'child' : safe.form === 'pet' ? 'bunny' : 'spirit');
  const path = currentOutcome?.branch || safe.evolutions?.at(-1)?.path || 'guardian';
  const formId = currentOutcome?.toFormId || `${species}-${growthStage}-${path}`;

  const stageNames: Record<CompanionGrowthStage, string> = {
    hatchling: 'Hatchling',
    child: 'Little adventurer',
    juvenile: 'Young explorer',
    grown: 'Grown companion',
    elder: 'Elder companion',
  };
  const stage = stageNames[lifecycleStage] || 'Companion';

  const active = safe.careRequest?.state === 'active' ? safe.careRequest : undefined;
  let request: CompanionRequest | null = null;
  if (active && safe.lifeStatus !== 'deceased' && safe.lifeStatus !== 'retired') {
    const requestTexts: Record<CareAction, string> = {
      feed: 'Could we have a little snack together?',
      play: 'Will you play a tiny game with me?',
      rest: 'I think a cozy nap would help me recharge.',
      cuddle: 'Can I have a little cuddle?',
      explore: 'Want to look for a small adventure together?',
      clean: 'I feel a bit dusty. Could we do a quick clean up?',
      medicine: 'I need some medicine to feel better.',
    };
    request = {
      id: active.id,
      action: active.action,
      state: active.state,
      text: requestTexts[active.action] || 'Can we share a little moment?',
      urgency: (active.action === 'feed' || active.action === 'medicine') ? 'soon' : 'gentle',
    };
  }

  const isProtected = Boolean(safe.protectionUntil && new Date(safe.protectionUntil).getTime() > now.getTime());
  const isPaused = Boolean(
    safe.lastEngagementAt &&
    now.getTime() > new Date(safe.lastEngagementAt).getTime() + AUTO_PAUSE_HOURS * 3600 * 1000
  );

  return {
    ...safe,
    id: String(_id || COMPANION_KEY),
    needs,
    health: Math.round(safe.health ?? 100),
    hygiene: Math.round(safe.hygiene ?? 100),
    lifeStatus: safe.lifeStatus || 'alive',
    healthCondition: safe.healthCondition || 'well',
    simulatedAgeHours: safe.simulatedAgeHours ?? 0,
    simulatedAgeDays: Math.floor((safe.simulatedAgeHours ?? 0) / 24),
    generation: safe.generation || 1,
    lineageId: safe.lineageId || String(_id || COMPANION_KEY),
    predecessorId: safe.predecessorId || null,
    deceasedAt: safe.deceasedAt || null,
    deathReason: safe.deathReason || null,
    retiredAt: safe.retiredAt || null,
    isProtected,
    protectionUntil: safe.protectionUntil || null,
    isPaused,
    allowedActions: computeAllowedActions(settled),
    nextStageRequirement: calculateNextStageRequirement(settled),
    level,
    growthStage,
    lifecycleStage,
    formId,
    stage,
    wish: wishes[(Math.floor(now.getTime() / 86_400_000) + Math.floor(safe.traits.curiosity)) % wishes.length] || wishes[0]!,
    request,
  };
}
