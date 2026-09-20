import { randomUUID } from 'node:crypto';
import { simulateCompanion } from './companionSimulation.js';
import type { StoredCompanion, PublicCompanion, Profile, CompanionMood, CareAction, LifecycleCareAction, CompanionSetup, Temperament, CompanionGrowthStage, CompanionState } from '../../../shared/contracts.js';

export const COMPANION_KEY = 'joe-and-focus';
export const COMPANION_FAMILY_ID = 'joe-and-focus';
export const COMPANION_SCHEMA_VERSION = 3;
export const ACTIONS = Object.freeze(['feed', 'play', 'cuddle', 'rest', 'explore']);
export const MOODS = Object.freeze(['curious', 'happy', 'cozy', 'sleepy', 'playful']);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export const displayName = (actor) => actor === 'joe' ? 'Joe' : 'Focus';
export const growthStageForLevel = (level: number): CompanionGrowthStage => level < 3 ? 'hatchling' : level < 6 ? 'child' : level < 10 ? 'juvenile' : 'grown';
const emptyCareSummary = () => ({ actions: { feed: 0, play: 0, cuddle: 0, rest: 0, explore: 0, clean: 0, medicine: 0 }, caregivers: { joe: 0, focus: 0 } });
const dayBudget = (budget: StoredCompanion['xpBudget'], now: Date) => budget?.day === now.toISOString().slice(0, 10) ? budget : { day: now.toISOString().slice(0, 10), care: 0, chat: 0 };

export function initialCompanion(): StoredCompanion {
  const now = new Date();
  return {
    familyId: COMPANION_FAMILY_ID, schemaVersion: COMPANION_SCHEMA_VERSION, archivedAt: null,
    name: 'Mochi', form: 'creature', seed: 'A round little forest spirit with leaf ears, soft lavender fur, and a curious smile.',
    inspirations: { joe: '', focus: '' }, bornAt: null, updatedAt: now, needsUpdatedAt: now,
    needs: { fullness: 75, energy: 80, joy: 75, comfort: 75, hygiene: 100, health: 100 },
    traits: { curiosity: 50, affection: 50, playfulness: 50 }, bonds: { joe: 0, focus: 0 },
    xp: 0, mood: 'curious', thought: 'I wonder what our first little adventure will be.', chatColor: '#cdb2ea',
    behaviorState: 'active', restUntil: null, careRequest: null, careSummary: emptyCareSummary(), xpBudget: dayBudget(undefined, now), behaviorWindow: [], stageOutcomes: [], lifecycleEvents: [],
    appearance: { visualStyle: 'soft', animated: true, usePortrait: false },
    lifecycle: { rulesVersion: 3, lifeStatus: 'alive', healthCondition: 'well', stage: 'hatchling', simulatedAgeHours: 0, stageCareCount: 0, lowNeedExposureHours: 0, simulationAt: now, lastEngagementAt: now, protectionUntil: null, lastMedicineAt: null, terminalAt: null, terminalReason: null, generation: 1, lineageId: randomUUID(), predecessorId: null },
    memories: [], turns: [], portrait: null, revision: 0
  };
}

export function settledState(state: StoredCompanion, now = new Date()): StoredCompanion {
  if (state.lifecycle) return simulateCompanion(state, now).state;
  const clock = state.needsUpdatedAt || state.updatedAt;
  const nowMs = now.getTime();
  const clockMs = new Date(clock).getTime();
  if (!Number.isFinite(nowMs) || !Number.isFinite(clockMs)) throw new Error('Companion clock is invalid.');
  if (nowMs < clockMs) return { ...state, appearance: state.appearance || { visualStyle: 'soft', animated: true, usePortrait: false } };
  if (state.archivedAt) return { ...state, appearance: state.appearance || { visualStyle: 'soft', animated: true, usePortrait: false } };
  const elapsedMs = Math.min(nowMs - clockMs, 24 * 3_600_000);
  const hours = elapsedMs / 3_600_000;
  const intervalEndMs = clockMs + elapsedMs;
  const restUntilMs = state.behaviorState === 'resting' && state.restUntil ? new Date(state.restUntil).getTime() : Number.NaN;
  if (state.behaviorState === 'resting' && state.restUntil && !Number.isFinite(restUntilMs)) throw new Error('Companion rest clock is invalid.');
  const restHours = Number.isFinite(restUntilMs) ? Math.max(0, Math.min(intervalEndMs, restUntilMs) - clockMs) / 3_600_000 : 0;
  const awakeHours = hours - restHours;
  const resting = state.behaviorState === 'resting' && Number.isFinite(restUntilMs) && restUntilMs > nowMs;
  const waking = state.behaviorState === 'resting' && !resting;
  return {
    ...state,
    // Portraits remain in old records for backwards-compatible data reads, but
    // rendered forms are now entirely authored and evolve in-app.
    appearance: state.appearance || { visualStyle: 'soft', animated: true, usePortrait: false },
    needsUpdatedAt: now,
    needs: {
      fullness: clamp(state.needs.fullness - hours * 3, 20),
      energy: clamp(state.needs.energy + restHours * 12 - awakeHours * 2, 20),
      joy: clamp(state.needs.joy - hours * 2, 25),
      comfort: clamp((state.needs.comfort ?? 75) - hours * 1.5, 25),
      hygiene: state.needs.hygiene ?? 100,
      health: state.needs.health ?? 100,
    },
    behaviorState: waking ? 'active' : state.behaviorState || 'active',
    restUntil: waking ? null : state.restUntil || null,
    mood: waking ? 'cozy' : state.mood
  };
}

export function refreshCareRequest(state: StoredCompanion, now = new Date()): StoredCompanion {
  const next = settledState(state, now);
  if (next.lifecycle && next.lifecycle.lifeStatus !== 'alive') return { ...next, careRequest: null };
  const current = next.careRequest;
  const value = (action: LifecycleCareAction) => action === 'feed' ? next.needs.fullness : action === 'play' ? next.needs.joy : action === 'cuddle' ? next.needs.comfort : action === 'rest' ? next.needs.energy : action === 'clean' ? next.needs.hygiene : action === 'medicine' ? next.needs.health : next.needs.joy;
  if (next.lifecycle?.healthCondition === 'ill' && next.needs.health < 100) {
    if (current?.state === 'active' && current.action === 'medicine') return next;
    if (current?.state === 'active') next.careRequest = { ...current, state: 'superseded', fulfilledAt: now };
    next.careRequest = { id: randomUUID(), action: 'medicine', state: 'active', createdAt: now };
    return next;
  }
  if (current?.state === 'active' && value(current.action) < 60) return next;
  if (current?.state === 'active') next.careRequest = { ...current, state: 'resolved', fulfilledAt: now };
  const candidates: [LifecycleCareAction, number][] = [['clean', next.needs.hygiene], ['feed', next.needs.fullness], ['play', next.needs.joy], ['rest', next.needs.energy], ['cuddle', next.needs.comfort]];
  const urgent = candidates.filter(([, score]) => score < 45).sort((a, b) => a[1] - b[1])[0];
  if (urgent) next.careRequest = { id: randomUUID(), action: urgent[0], state: 'active', createdAt: now };
  return next;
}

export function remember(state: StoredCompanion, actor: Profile, kind: string, text: string, now = new Date(), id: string = randomUUID()): StoredCompanion {
  return { ...state, memories: [...state.memories, { id, actor, kind, text, at: now }].slice(-80) };
}

export function careFor(state: StoredCompanion, actor: Profile, action: CareAction, now = new Date()): StoredCompanion {
  if (!ACTIONS.includes(action) || !['joe', 'focus'].includes(actor)) throw new Error('Invalid care action.');
  const next = settledState(state, now);
  if (action === 'rest' && next.behaviorState === 'resting' && next.restUntil && new Date(next.restUntil).getTime() > now.getTime()) return next;
  next.traits = { ...next.traits };
  next.bonds = { ...next.bonds, [actor]: next.bonds[actor] + 1 };
  const budget = dayBudget(state.xpBudget, now);
  const person = displayName(actor);
  const effects: Record<CareAction, [number, number, number, number, CompanionMood, keyof StoredCompanion['traits'], string]> = {
    feed: [24, 0, 4, 3, 'cozy', 'affection', `${person} brought me a snack. I saved a tiny imaginary bite for later.`],
    play: [-5, -12, 24, 4, 'playful', 'playfulness', `We invented a game! I think ${person} let me win the last round.`],
    cuddle: [0, 4, 14, 26, 'cozy', 'affection', `A little cuddle with ${person}. My favorite place is somewhere cozy.`],
    rest: [-2, 30, 3, 12, 'sleepy', 'affection', `${person} tucked me in. Tonight I might dream about floating islands.`],
    explore: [-6, -10, 16, 2, 'curious', 'curiosity', `I explored with ${person} and found a pebble that looks like a moon!`]
  };
  const [food, energy, joy, comfort, mood, trait, thought] = effects[action];
  const primaryBefore = action === 'feed' ? next.needs.fullness : action === 'play' || action === 'explore' ? next.needs.joy : action === 'cuddle' ? (next.needs.comfort ?? 75) : next.needs.energy;
  next.needs = { fullness: clamp(next.needs.fullness + food, 20), energy: clamp(next.needs.energy + energy, 20), joy: clamp(next.needs.joy + joy, 25), comfort: clamp(next.needs.comfort + comfort, 25), hygiene: next.needs.hygiene ?? 100, health: next.needs.health ?? 100 };
  const primaryAfter = action === 'feed' ? next.needs.fullness : action === 'play' || action === 'explore' ? next.needs.joy : action === 'cuddle' ? next.needs.comfort : next.needs.energy;
  next.traits[trait] = clamp(next.traits[trait] + 2);
  next.mood = mood;
  next.thought = thought;
  if (action === 'rest') { next.behaviorState = 'resting'; next.restUntil = new Date(now.getTime() + 45 * 60_000); }
  const meaningful = primaryBefore < 85 && primaryAfter > primaryBefore;
  let reward = meaningful && budget.care < 40 ? 8 : 0;
  const request = next.careRequest;
  if (request?.state === 'active' && request.action === action && primaryBefore < 60) {
    next.careRequest = { ...request, state: 'fulfilled', fulfilledAt: now, fulfilledBy: actor };
    if (budget.care + reward <= 36) reward += 4;
  }
  next.xp = state.xp + reward;
  next.xpBudget = { ...budget, care: budget.care + reward };
  const summary = state.careSummary || emptyCareSummary();
  next.careSummary = { actions: { ...summary.actions, [action]: (summary.actions[action] || 0) + 1 }, caregivers: { ...summary.caregivers, [actor]: (summary.caregivers[actor] || 0) + 1 } };
  next.behaviorWindow = [...(state.behaviorWindow || []), { action, actor, at: now }].slice(-24);
  return refreshCareRequest(remember(next, actor, action, `${person} chose to ${action} with me.`, now), now);
}

export function forgetMemory(state: StoredCompanion, id: string): StoredCompanion {
  // Replies can paraphrase older memories, so clear conversational context and
  // the current thought too. Numerical growth is intentionally retained.
  return { ...state, memories: state.memories.filter((memory) => memory.id !== id), turns: [], thought: 'Ready for a new little adventure.' };
}

export function validateSetup(body: Partial<CompanionSetup>) {
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
  return body && text(body.name, 32) && ['pet', 'child', 'creature'].includes(body.form) && text(body.seed, 500)
    && ['curious', 'gentle', 'playful'].includes(body.temperament)
    && (body.appearance === undefined || validateAppearance(body.appearance));
}

export function validateAppearance(value: unknown): value is import('../../../shared/contracts.js').CompanionAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const appearance = value as Record<string, unknown>;
  const color = (entry) => entry === undefined || (typeof entry === 'string' && /^#[0-9a-fA-F]{6}$/.test(entry));
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
  return { curiosity: temperament === 'curious' ? 65 : 45, affection: temperament === 'gentle' ? 65 : 45, playfulness: temperament === 'playful' ? 65 : 45 };
}

export function publicCompanion(state: StoredCompanion, now = new Date()): PublicCompanion {
  const simulation = state.lifecycle ? simulateCompanion(state, now) : null;
  const settled = simulation?.state || settledState(state, now);
  const { _id, __v, lockToken, lockedUntil, budget, lastCare, recentOperations, familyId, schemaVersion, needsUpdatedAt, createdOperationId, ...safe } = settled;
  const needs = Object.fromEntries(Object.entries(safe.needs).map(([key, value]) => [key, Math.round(value)])) as CompanionState['needs'];
  const level = Math.floor(safe.xp / 80) + 1;
  const wishes = ['Show me something that made you smile today.', 'Could we make up a tiny adventure together?', 'Tell me a song you love. I want to imagine its colors.', 'What should we name our imaginary moon garden?'];
  const growthStage = safe.lifecycle?.stage || growthStageForLevel(level);
  const species = safe.appearance?.species || (safe.form === 'child' ? 'child' : safe.form === 'pet' ? 'bunny' : 'spirit');
  const path = safe.stageOutcomes?.at(-1)?.branch || safe.evolutions?.at(-1)?.path || 'guardian';
  const formId = safe.stageOutcomes?.at(-1)?.toFormId || `${species}-${growthStage}-${path}`;
  const stage = growthStage === 'hatchling' ? 'Hatchling' : growthStage === 'child' ? 'Little adventurer' : growthStage === 'juvenile' ? 'Young explorer' : growthStage === 'elder' ? 'Elder companion' : 'Grown companion';
  const active = safe.careRequest?.state === 'active' ? safe.careRequest : undefined;
  const request = safe.lifecycle?.lifeStatus !== 'alive' ? null : active ? { id: active.id, action: active.action, state: active.state, text: active.action === 'feed' ? 'Could we have a little snack together?' : active.action === 'play' ? 'Will you play a tiny game with me?' : active.action === 'rest' ? 'I think a cozy nap would help me recharge.' : active.action === 'clean' ? 'Could you help me freshen up?' : active.action === 'medicine' ? 'I do not feel well. Could you help with medicine?' : 'Can I have a little cuddle?', urgency: ['feed', 'medicine'].includes(active.action) ? 'soon' as const : 'gentle' as const }
    : { id: 'explore', action: 'explore' as const, state: 'resolved' as const, text: 'Want to look for a small adventure together?', urgency: 'gentle' as const };
  const medicineReady = safe.lifecycle?.healthCondition === 'ill' && safe.needs.health < 100 && (!safe.lifecycle.lastMedicineAt || now.getTime() - new Date(safe.lifecycle.lastMedicineAt).getTime() >= 6 * 3_600_000);
  const resting = safe.behaviorState === 'resting' && safe.restUntil && new Date(safe.restUntil).getTime() > now.getTime();
  const allowedActions: LifecycleCareAction[] = safe.lifecycle?.lifeStatus === 'alive' ? ['feed', 'play', 'cuddle', ...(!resting ? ['rest' as const] : []), 'explore', 'clean', ...(medicineReady ? ['medicine' as const] : [])] : [];
  return { ...safe, id: String(_id || COMPANION_KEY), needs, level, growthStage, formId, stage, wish: wishes[(Math.floor(now.getTime() / 86_400_000) + Math.floor(safe.traits.curiosity)) % wishes.length], request, allowedActions, automaticallyPaused: simulation?.automaticallyPaused || false };
}
