import { randomInt } from 'node:crypto';
import { growthStageForLevel } from './companionState.js';
import type { StoredCompanion, CompanionEvolution, CompanionSpecies, CompanionGrowthStage } from '../../../shared/contracts.js';

const raceBias: Record<CompanionSpecies, [number, number, number]> = {
  spirit: [4, 8, 0], bunny: [0, 8, 4], cat: [4, 0, 8], fox: [4, 0, 8],
  dragon: [8, 4, 0], robot: [8, 0, 4], child: [4, 4, 4], custom: [4, 4, 4]
};
const paths: CompanionEvolution['path'][] = ['explorer', 'guardian', 'trickster'];
const transitionLevels: Record<'child' | 'juvenile' | 'grown', number> = { child: 3, juvenile: 6, grown: 10 };

export function formIdFor(species: CompanionSpecies, stage: CompanionGrowthStage, branch: CompanionEvolution['path']) {
  return `${species}-${stage}-${branch}-v2`;
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
  const outcomes = [...(state.stageOutcomes || [])];
  for (const [stage, milestone] of Object.entries(transitionLevels) as [Exclude<CompanionGrowthStage, 'hatchling'>, number][]) {
    if (milestone <= previousLevel || milestone > level || outcomes.some((entry) => entry.level === milestone)) continue;
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let selected = paths.at(-1);
    for (let index = 0; index < weights.length; index++) {
      roll -= weights[index];
      if (roll < 0) { selected = paths[index]; break; }
    }
    evolutions.push({ level: milestone, species, path: selected, at: now });
    const priorStage = growthStageForLevel(milestone - 1);
    outcomes.push({ id: `stage-${milestone}-${selected}`, level: milestone, stage, fromFormId: formIdFor(species, priorStage, outcomes.at(-1)?.branch || 'guardian'), toFormId: formIdFor(species, stage, selected), branch: selected, rulesVersion: 2, at: now });
  }
  return { ...state, evolutions: evolutions.slice(-40), stageOutcomes: outcomes.slice(-12) };
}
