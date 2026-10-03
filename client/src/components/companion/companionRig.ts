import type { CompanionSpecies, LifecycleCareAction } from '../../../../shared/contracts.js';
import type { CompanionActivity } from './types.js';
import { candidateRigs } from './rigCandidates.generated.js';

export type AnimationState = 'idle' | 'blink' | 'locomotion' | 'happy' | 'play' | 'eat' | 'sleep' | 'surprised' | 'growth';
export type RigArchetype = 'upright' | 'quadruped' | 'frog';
export type Point = readonly [number, number];
export interface RigTransform { translate: Point; rotate: number; scale: Point }
export interface RigPart {
  id: string;
  parent?: string;
  source: string;
  stateSources?: Partial<Record<AnimationState, string>>;
  bounds: readonly [number, number, number, number];
  pivot: Point;
  order: number;
  rest: RigTransform;
  motion?: 'body' | 'leg' | 'ear' | 'tail' | 'leaf' | 'antenna' | 'eyes';
  multiplier: number;
  phase: number;
}
export interface CompanionRig {
  version: 1;
  species: CompanionSpecies;
  formId: string;
  archetype: RigArchetype;
  canvas: readonly [512, 512];
  anchor: Point;
  safeBounds: readonly [number, number, number, number];
  shadow: 'runtime';
  sleepExpression?: 'eyelids';
  parts: readonly RigPart[];
}

export const rigArchetypes = {
  bunny: 'upright', child: 'upright', custom: 'upright', duck: 'upright', robot: 'upright', spirit: 'upright',
  cat: 'quadruped', dog: 'quadruped', fox: 'quadruped', dragon: 'quadruped', frog: 'frog',
} as const satisfies Record<CompanionSpecies, RigArchetype>;

export function animationState(activity: CompanionActivity, walking: boolean, face: string, reaction: LifecycleCareAction | '' = '', growth = false): AnimationState {
  if (activity === 'sleeping' || face === 'sleepy') return 'sleep';
  if (growth) return 'growth';
  if (reaction === 'rest') return 'sleep';
  if (reaction === 'feed') return 'eat';
  if (reaction === 'play') return 'play';
  if (reaction) return 'happy';
  if (activity === 'success') return 'happy';
  if (activity === 'error') return 'surprised';
  if (walking) return 'locomotion';
  if (face === 'happy' || face === 'mischievous') return 'happy';
  return 'idle';
}

/** Reject incomplete graphs before rendering. Pivots/bounds use the shared stage,
 * including children; parent transforms compose without changing rest placement. */
export function validateRig(rig: CompanionRig): void {
  const ids = new Set(rig.parts.map((part) => part.id));
  if (ids.size !== rig.parts.length || !ids.size) throw new Error('Rig needs unique parts');
  const finite = (values: readonly number[]) => values.every(Number.isFinite);
  if (rig.version !== 1 || rig.canvas[0] !== 512 || rig.canvas[1] !== 512 || rig.anchor[0] !== 256 || rig.anchor[1] !== 448 || rig.shadow !== 'runtime' || !finite(rig.safeBounds) || rig.safeBounds[2] <= 0 || rig.safeBounds[3] <= 0 || rig.archetype !== rigArchetypes[rig.species]) throw new Error('Invalid rig stage');
  for (const part of rig.parts) {
    if (!finite([...part.bounds, ...part.pivot, ...part.rest.translate, ...part.rest.scale, part.rest.rotate, part.order, part.multiplier, part.phase]) || part.bounds[2] <= 0 || part.bounds[3] <= 0) throw new Error(`Invalid geometry: ${part.id}`);
    const seen = new Set([part.id]);
    let parent = part.parent;
    while (parent) {
      if (!ids.has(parent) || seen.has(parent)) throw new Error(`Invalid parent: ${part.id}`);
      seen.add(parent);
      parent = rig.parts.find((entry) => entry.id === parent)!.parent;
    }
  }
}

/** Explicitly reviewed base poses and configured motion. This list is maintained
 * separately from candidate generation; saved evolved forms match exact IDs. */
export const reviewedBaseSpecies: readonly CompanionSpecies[] = ['fox','bunny','robot','frog','cat','dog','dragon','duck','spirit','child','custom'];
export const companionRigs: Partial<Record<CompanionSpecies, Record<string, CompanionRig>>> = Object.fromEntries(
  reviewedBaseSpecies.map(species => [species, { base: candidateRigs[species]! }])
);

export function registeredRig(species: CompanionSpecies, formId: string): CompanionRig | undefined {
  const rig = companionRigs[species]?.[formId];
  if (!rig || rig.species !== species || rig.formId !== formId) return undefined;
  try { validateRig(rig); return rig; } catch { return undefined; }
}
