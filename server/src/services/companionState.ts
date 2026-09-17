import { randomUUID } from 'node:crypto';
import type { StoredCompanion, PublicCompanion, Profile, CompanionMood, CareAction, CompanionSetup, Temperament } from '../../../shared/contracts.js';

export const COMPANION_KEY = 'joe-and-focus';
export const ACTIONS = Object.freeze(['feed', 'play', 'cuddle', 'rest', 'explore']);
export const MOODS = Object.freeze(['curious', 'happy', 'cozy', 'sleepy', 'playful']);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
export const displayName = (actor) => actor === 'joe' ? 'Joe' : 'Focus';

export function initialCompanion(): StoredCompanion {
  return {
    name: 'Mochi', form: 'creature', seed: 'A round little forest spirit with leaf ears, soft lavender fur, and a curious smile.',
    inspirations: { joe: '', focus: '' }, bornAt: null, updatedAt: new Date(),
    needs: { fullness: 75, energy: 80, joy: 75 },
    traits: { curiosity: 50, affection: 50, playfulness: 50 }, bonds: { joe: 0, focus: 0 },
    xp: 0, mood: 'curious', thought: 'I wonder what our first little adventure will be.', chatColor: '#cdb2ea',
    appearance: { visualStyle: 'soft', animated: true, usePortrait: true },
    memories: [], turns: [], portrait: null, revision: 0
  };
}

export function settledState(state: StoredCompanion, now = new Date()): StoredCompanion {
  const hours = clamp((now.getTime() - new Date(state.updatedAt).getTime()) / 3_600_000, 0, 48);
  return {
    ...state,
    appearance: state.appearance || { visualStyle: state.portrait?.url ? 'pixel' : 'soft', animated: true, usePortrait: true },
    needs: {
      fullness: Math.round(clamp(state.needs.fullness - hours * 2, 20)),
      energy: Math.round(clamp(state.needs.energy + hours * 3, 20)),
      joy: Math.round(clamp(state.needs.joy - hours, 35))
    }
  };
}

export function remember(state: StoredCompanion, actor: Profile, kind: string, text: string, now = new Date(), id: string = randomUUID()): StoredCompanion {
  return { ...state, memories: [...state.memories, { id, actor, kind, text, at: now }].slice(-80) };
}

export function careFor(state: StoredCompanion, actor: Profile, action: CareAction, now = new Date()): StoredCompanion {
  if (!ACTIONS.includes(action) || !['joe', 'focus'].includes(actor)) throw new Error('Invalid care action.');
  const next = settledState(state, now);
  next.traits = { ...state.traits };
  next.bonds = { ...state.bonds, [actor]: state.bonds[actor] + 1 };
  next.xp = state.xp + 8;
  const person = displayName(actor);
  const effects: Record<CareAction, [number, number, number, CompanionMood, keyof StoredCompanion['traits'], string]> = {
    feed: [24, 0, 4, 'cozy', 'affection', `${person} brought me a snack. I saved a tiny imaginary bite for later.`],
    play: [-5, -12, 24, 'playful', 'playfulness', `We invented a game! I think ${person} let me win the last round.`],
    cuddle: [0, 4, 14, 'cozy', 'affection', `A little cuddle with ${person}. My favorite place is somewhere cozy.`],
    rest: [-2, 30, 3, 'sleepy', 'affection', `${person} tucked me in. Tonight I might dream about floating islands.`],
    explore: [-6, -10, 16, 'curious', 'curiosity', `I explored with ${person} and found a pebble that looks like a moon!`]
  };
  const [food, energy, joy, mood, trait, thought] = effects[action];
  next.needs = { fullness: clamp(next.needs.fullness + food, 20), energy: clamp(next.needs.energy + energy, 20), joy: clamp(next.needs.joy + joy, 35) };
  next.traits[trait] = clamp(next.traits[trait] + 2);
  next.mood = mood;
  next.thought = thought;
  return remember(next, actor, action, `${person} chose to ${action} with me.`, now);
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
  return ['soft', 'pixel'].includes(appearance.visualStyle as string)
    && typeof appearance.animated === 'boolean' && typeof appearance.usePortrait === 'boolean'
    && Object.keys(appearance).every((key) => ['visualStyle', 'animated', 'usePortrait'].includes(key));
}

export function startingTraits(temperament: Temperament) {
  return { curiosity: temperament === 'curious' ? 65 : 45, affection: temperament === 'gentle' ? 65 : 45, playfulness: temperament === 'playful' ? 65 : 45 };
}

export function publicCompanion(state: StoredCompanion, now = new Date()): PublicCompanion {
  const { _id, __v, lockToken, lockedUntil, budget, lastCare, recentOperations, ...safe } = settledState(state, now);
  const level = Math.floor(safe.xp / 80) + 1;
  const wishes = ['Show me something that made you smile today.', 'Could we make up a tiny adventure together?', 'Tell me a song you love. I want to imagine its colors.', 'What should we name our imaginary moon garden?'];
  return { ...safe, level, stage: level < 3 ? 'Little one' : level < 7 ? 'Growing explorer' : 'Dream keeper', wish: wishes[(Math.floor(now.getTime() / 86_400_000) + Math.floor(safe.traits.curiosity)) % wishes.length] };
}
