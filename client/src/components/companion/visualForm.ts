import type { CompanionGrowthStage, CompanionSpecies, CompanionVisualForm, PublicCompanion } from '../../../../shared/contracts.js';

type VisualSource = Pick<PublicCompanion, 'xp' | 'form' | 'appearance' | 'evolutions' | 'stageOutcomes'> & Partial<Pick<PublicCompanion, 'visualForm' | 'growthStage' | 'lifecycle'>>;

/** Compatibility-only client derivation for a snapshot created before visualForm. */
export function visualFormFor(companion: VisualSource): CompanionVisualForm {
  if (companion.visualForm) return companion.visualForm;
  const level = Math.floor(Math.max(0, companion.xp || 0) / 80) + 1;
  const xpTier: CompanionVisualForm['xpTier'] = level >= 10 ? 3 : level >= 6 ? 2 : level >= 3 ? 1 : 0;
  const species: CompanionSpecies = companion.appearance?.species || (companion.form === 'child' ? 'child' : companion.form === 'pet' ? 'bunny' : 'spirit');
  const milestone = ([undefined, 3, 6, 10] as const)[xpTier];
  const xpPath = (milestone && companion.evolutions?.find((entry) => entry.level === milestone)?.path)
    || companion.stageOutcomes?.filter((entry) => entry.level <= level).at(-1)?.branch || 'guardian';
  const lifeStage: CompanionGrowthStage = companion.lifecycle?.stage || companion.growthStage || 'hatchling';
  return { species, xpTier, xpPath, lifeStage };
}
