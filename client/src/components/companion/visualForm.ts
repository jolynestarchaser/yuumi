import type { CompanionGrowthStage, CompanionSpecies, CompanionVisualForm, PublicCompanion } from '../../../../shared/contracts.js';

type VisualSource = Pick<PublicCompanion, 'xp' | 'form' | 'appearance' | 'evolutions' | 'stageOutcomes'> & Partial<Pick<PublicCompanion, 'visualForm' | 'growthStage' | 'lifecycle'>>;

/** Compatibility-only client derivation for a snapshot created before visualForm. */
export function visualFormFor(companion: VisualSource): CompanionVisualForm {
  if (companion.visualForm) return companion.visualForm;
  const level = Math.floor(Math.max(0, companion.xp || 0) / 80) + 1;
  const xpTier: CompanionVisualForm['xpTier'] = level >= 10 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0;
  const species: CompanionSpecies = companion.appearance?.species || (companion.form === 'child' ? 'child' : companion.form === 'pet' ? 'bunny' : 'spirit');
  const earned = companion.evolutions?.filter((entry) => entry.level <= level && entry.level >= 2).sort((a, b) => b.level - a.level)[0];
  const xpPath = level >= 2 ? earned?.path || companion.stageOutcomes?.filter((entry) => entry.level <= level).at(-1)?.branch || 'guardian' : 'guardian';
  const inferredStage: CompanionGrowthStage = level < 3 ? 'hatchling' : level < 6 ? 'child' : level < 10 ? 'juvenile' : 'grown';
  const lifeStage: CompanionGrowthStage = companion.lifecycle?.stage || companion.growthStage || inferredStage;
  return { species, xpTier, xpPath, lifeStage };
}
