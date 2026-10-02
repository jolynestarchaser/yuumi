import { randomInt } from 'node:crypto';
import { applyPetGrowth } from './petProgression.js';
import { petLevel } from './petCatalog.js';
import type { StoredCompanion, CompanionEvolution, CompanionSpecies, CompanionGrowthStage, CompanionVisualForm } from '../../../shared/contracts.js';

const raceBias: Record<CompanionSpecies, [number, number, number]> = {
  spirit: [4, 8, 0], bunny: [0, 8, 4], cat: [4, 0, 8], dog: [4, 8, 0], frog: [8, 4, 0], duck: [4, 8, 0], fox: [4, 0, 8],
  dragon: [8, 4, 0], robot: [8, 0, 4], child: [4, 4, 4], custom: [4, 4, 4]
};
const paths: CompanionEvolution['path'][] = ['explorer', 'guardian', 'trickster'];
const evolutionHistoryLimit = 40;

export function formIdFor(species: CompanionSpecies, stage: CompanionGrowthStage, branch: CompanionEvolution['path'], level: number): string {
  return `${species}-${stage}-level-${level}-${branch}-v3`;
}

export function xpTierForLevel(level: number): CompanionVisualForm['xpTier'] {
  if (level >= 10) return 3;
  if (level >= 6) return 2;
  if (level >= 3) return 1;
  return 0;
}

/** Derives the current recipe without turning legacy history into new events. */
export function visualFormFor(state: Pick<StoredCompanion, 'xp' | 'form' | 'appearance' | 'evolutions' | 'stageOutcomes' | 'lifecycle' | 'progression'>): CompanionVisualForm {
  const level = state.progression ? petLevel(state.xp, state.progression.legacyLevel) : Math.floor(Math.max(0, state.xp || 0) / 80) + 1;
  const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
  const tier = xpTierForLevel(level);
  const earned = state.evolutions?.filter((entry) => entry.level <= level && entry.level >= 2).sort((a, b) => b.level - a.level)[0];
  // Old records sometimes stored an evolution branch in stage history. It is a
  // compatibility hint only; lifecycle history is never written by XP growth.
  const legacy = state.stageOutcomes?.filter((entry) => entry.level <= level).at(-1);
  const lifeStage: CompanionGrowthStage = level < 3 ? 'hatchling' : level < 6 ? 'child' : level < 10 ? 'juvenile' : 'grown';
  return { species, xpTier: tier, xpPath: level >= 2 ? earned?.path || legacy?.branch || 'guardian' : 'guardian', lifeStage: state.lifecycle?.stage || lifeStage };
}

// Called inside the existing atomic lease, after a successful XP-earning action.
// Only server state determines growth; retries never reroll an earned evolution.
export function evolveCompanion(state: StoredCompanion, previousXp: number, random = () => randomInt(1_000_000) / 1_000_000, now = new Date()): StoredCompanion {
  if (state.progression) return applyPetGrowth(state, now);
  const previousLevel = Math.floor(previousXp / 80) + 1;
  const level = Math.floor(state.xp / 80) + 1;
  if (level <= previousLevel) return state;
  const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
  const traits = [state.traits.curiosity, state.traits.affection, state.traits.playfulness];
  const weights = traits.map((value, index) => 1 + (Math.max(0, Math.min(100, value)) / 25) ** 2 + raceBias[species][index]);
  const evolutions = [...(state.evolutions || [])];
  for (let earnedLevel = Math.max(2, previousLevel + 1, level - evolutionHistoryLimit + 1); earnedLevel <= level; earnedLevel++) {
    if (evolutions.some((entry) => entry.level === earnedLevel)) continue;
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    let selected: CompanionEvolution['path'] = paths.at(-1) || 'guardian';
    for (let index = 0; index < weights.length; index++) {
      roll -= weights[index];
      if (roll < 0) { selected = paths[index]; break; }
    }
    evolutions.push({ level: earnedLevel, species, path: selected, at: now });
  }
  return { ...state, evolutions: evolutions.sort((a, b) => a.level - b.level).slice(-evolutionHistoryLimit) };
}
