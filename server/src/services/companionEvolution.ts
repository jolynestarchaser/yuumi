import { randomInt } from 'node:crypto';
import type { StoredCompanion, CompanionEvolution, CompanionSpecies, CompanionGrowthStage, CompanionVisualForm } from '../../../shared/contracts.js';

const raceBias: Record<CompanionSpecies, [number, number, number]> = {
  spirit: [4, 8, 0], bunny: [0, 8, 4], cat: [4, 0, 8], fox: [4, 0, 8],
  dragon: [8, 4, 0], robot: [8, 0, 4], child: [4, 4, 4], custom: [4, 4, 4]
};
const paths: CompanionEvolution['path'][] = ['explorer', 'guardian', 'trickster'];
export const evolutionMilestones = [3, 6, 10] as const;

export function formIdFor(species: CompanionSpecies, stage: CompanionGrowthStage, branch: CompanionEvolution['path']) {
  return `${species}-${stage}-${branch}-v2`;
}

export function xpTierForLevel(level: number): CompanionVisualForm['xpTier'] {
  if (level >= 10) return 3;
  if (level >= 6) return 2;
  if (level >= 3) return 1;
  return 0;
}

/** Derives the current recipe without turning legacy history into new events. */
export function visualFormFor(state: Pick<StoredCompanion, 'xp' | 'form' | 'appearance' | 'evolutions' | 'stageOutcomes' | 'lifecycle'>): CompanionVisualForm {
  const level = Math.floor(Math.max(0, state.xp || 0) / 80) + 1;
  const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
  const tier = xpTierForLevel(level);
  const milestone = evolutionMilestones[tier - 1];
  const earned = milestone === undefined ? undefined : state.evolutions?.find((entry) => entry.level === milestone);
  // Old records sometimes stored an evolution branch in stage history. It is a
  // compatibility hint only; lifecycle history is never written by XP growth.
  const legacy = state.stageOutcomes?.filter((entry) => entry.level <= level).at(-1);
  return { species, xpTier: tier, xpPath: earned?.path || legacy?.branch || 'guardian', lifeStage: state.lifecycle?.stage || 'hatchling' };
}

// Called inside the existing atomic lease, after a successful XP-earning action.
// Only server state determines growth; retries never reroll an earned evolution.
export function evolveCompanion(state: StoredCompanion, previousXp: number, random = () => randomInt(1_000_000) / 1_000_000, now = new Date()): StoredCompanion {
  const previousLevel = Math.floor(previousXp / 80) + 1;
  const level = Math.floor(state.xp / 80) + 1;
  if (level <= previousLevel) return state;
  const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
  const traits = [state.traits.curiosity, state.traits.affection, state.traits.playfulness];
  const weights = traits.map((value, index) => 1 + (Math.max(0, Math.min(100, value)) / 25) ** 2 + raceBias[species][index]);
  const evolutions = [...(state.evolutions || [])];
  for (const milestone of evolutionMilestones) {
    if (milestone <= previousLevel || milestone > level || evolutions.some((entry) => entry.level === milestone)) continue;
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let selected = paths.at(-1);
    for (let index = 0; index < weights.length; index++) {
      roll -= weights[index];
      if (roll < 0) { selected = paths[index]; break; }
    }
    evolutions.push({ level: milestone, species, path: selected, at: now });
  }
  return { ...state, evolutions: evolutions.slice(-40) };
}
