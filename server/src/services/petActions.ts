import { randomInt, randomUUID } from 'node:crypto';
import { engageCompanion } from './companionSimulation.js';
import { rewardPetAction } from './petCare.js';
import { vector } from './petCatalog.js';
import type { LifecycleCareAction, PetActivitySession, PetCapability, Profile, StoredCompanion } from '../../../shared/contracts.js';

const fail = (message: string) => Object.assign(new Error(message), { status: 409 });
export function settlePetRest(state: StoredCompanion, now: Date, actor: Profile): StoredCompanion {
  const started = state.progression?.restStartedAt;
  if (!started || now.getTime() - new Date(started).getTime() < 20 * 60_000) return state;
  const next = rewardPetAction(state, 'rest', now, `rest:${new Date(started).toISOString()}`, actor);
  return { ...next, progression: { ...next.progression!, restStartedAt: null } };
}
export function applyPetCare(input: StoredCompanion, action: LifecycleCareAction, now: Date, actor: Profile, eventId: string): StoredCompanion {
  const before = settlePetRest(engageCompanion(input, now), now, actor);
  if (!before.progression || before.lifecycle?.lifeStatus !== 'alive') throw fail('This companion cannot receive care.');
  if (action === 'medicine') throw fail('This companion is well. Basic care is always free.');
  const needs = { ...before.needs };
  const primary = action === 'feed' ? 'fullness' : action === 'clean' ? 'hygiene' : action === 'rest' ? 'energy' : action === 'cuddle' ? 'comfort' : 'joy';
  const meaningful = needs[primary] < 85;
  if (action === 'rest' && before.behaviorState === 'resting') throw fail('This companion is already resting.');
  if ((action === 'play' || action === 'explore') && (needs.fullness < 35 || needs.energy < 25 || needs.hygiene < 30)) throw fail('A little care or rest will help before playing.');
  const effects = action === 'feed' ? { fullness: 30 } : action === 'clean' ? { hygiene: 35, comfort: 4 } : action === 'cuddle' ? { comfort: 8, joy: 4 }
    : action === 'play' ? { joy: 12, energy: -10 } : action === 'explore' ? { joy: 8, energy: -12, hygiene: -5 } : {};
  for (const [key, amount] of Object.entries(effects)) needs[key] = Math.max(0, Math.min(100, needs[key] + amount));
  const rest = action === 'rest';
  let next: StoredCompanion = { ...before, needs, mood: rest ? 'sleepy' : action === 'play' ? 'playful' : action === 'explore' ? 'curious' : 'cozy',
    ...(rest ? { behaviorState: 'resting', restUntil: new Date(now.getTime() + 45 * 60_000), progression: { ...before.progression, restStartedAt: meaningful ? now : null } } : {}),
    careSummary: { actions: { ...before.careSummary!.actions, [action]: before.careSummary!.actions[action] + 1 }, caregivers: { ...before.careSummary!.caregivers, [actor]: before.careSummary!.caregivers[actor] + 1 } },
    behaviorWindow: [...(before.behaviorWindow || []), { action, actor, at: now }].slice(-24),
  };
  // Play/explore awards are granted by completed activities, not this reaction button.
  if (!rest && action !== 'play' && action !== 'explore') next = rewardPetAction(next, action, now, eventId, actor, meaningful);
  if (meaningful && before.careRequest?.state === 'active' && before.careRequest.action === action) next.careRequest = { ...before.careRequest, state: 'fulfilled', fulfilledAt: now, fulfilledBy: actor };
  return next;
}
export function startPetActivity(input: StoredCompanion, family: PetActivitySession['family'], capability: PetCapability | null, actor: Profile, now: Date): StoredCompanion {
  if (!input.progression || input.needs.fullness < 35 || input.needs.energy < 25 || input.needs.hygiene < 30 || input.behaviorState === 'resting') throw fail('A little care or rest will help before playing.');
  if (capability && !input.progression.render.capabilityIds.includes(capability)) throw fail('That ability has not grown yet.');
  const allowedFamily = capability === 'greeting' ? 'rhythm' : capability === 'grasp' || capability === 'float' || capability === 'sense' ? 'find' : capability === 'water' ? 'explore' : family;
  if (family !== allowedFamily) throw fail('Choose an activity that uses this ability.');
  const current = input.progression.activity;
  if (current && new Date(current.expiresAt).getTime() > now.getTime()) throw fail('Finish the current activity first.');
  const activity: PetActivitySession = { sessionId: randomUUID(), family, capability, targets: Array.from({ length: 5 }, () => randomInt(3)), answers: [], actor, startedAt: now, expiresAt: new Date(now.getTime() + 10 * 60_000) };
  return { ...input, progression: { ...input.progression, activity } };
}
export function completePetActivityStep(input: StoredCompanion, sessionId: string, answer: number, actor: Profile, now: Date, eventId: string): StoredCompanion {
  const session = input.progression?.activity;
  if (!session || session.sessionId !== sessionId || session.actor !== actor || new Date(session.expiresAt).getTime() < now.getTime()) throw fail('This activity has ended. Start a new activity.');
  if (answer !== session.targets[session.answers.length]) throw fail('Try the highlighted choice again.');
  if (now.getTime() - new Date(session.startedAt).getTime() < (session.answers.length + 1) * 400) throw fail('Give your companion a moment for each step.');
  const activity = { ...session, answers: [...session.answers, answer] };
  if (activity.answers.length < activity.targets.length) return { ...input, progression: { ...input.progression!, activity } };
  const category = session.family === 'explore' ? 'explore' : 'play';
  const next = rewardPetAction(input, category, now, eventId, actor);
  return { ...next, mood: category === 'play' ? 'playful' : 'curious',
    needs: { ...next.needs, joy: Math.min(100, next.needs.joy + (category === 'play' ? 12 : 8)), energy: Math.max(0, next.needs.energy - (category === 'play' ? 10 : 12)), hygiene: Math.max(0, next.needs.hygiene - (category === 'explore' ? 5 : 0)) },
    progression: { ...next.progression!, activity: null },
  };
}
export function choosePetPrompt(input: StoredCompanion, choice: 'company' | 'nature' | 'quiet', now: Date, actor: Profile, eventId: string): StoredCompanion {
  const evidence = choice === 'company' ? vector([1, 0, 0, 0, 0, 0]) : choice === 'nature' ? vector([0, 0, .4, 0, .6, 0]) : vector([0, 0, 0, 1, 0, 0]);
  return rewardPetAction(input, 'chat', now, eventId, actor, true, evidence);
}
