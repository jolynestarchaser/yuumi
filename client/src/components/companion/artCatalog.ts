import type { CompanionEvolution, CompanionSpecies } from '../../../../shared/contracts.js';

export type ArtSpecies = CompanionSpecies | 'dog' | 'frog' | 'duck';
export type ArtGrowthFamily = 'wing_bud_soft' | 'horn_bud_branch' | 'gill_petal' | 'ribbon_wing' | 'tail_branch' | 'plush_reshape';
export type ArtRarity = 'neutral' | 'final';

export interface ArtRecipe {
  id: string;
  catalogVersion: 'pet-art-v1_1';
  speciesId: ArtSpecies;
  path: CompanionEvolution['path'];
  level: number;
  segmentId: string;
  growthFamilyId: ArtGrowthFamily;
  continuityTags: readonly string[];
  requiredFinalTags: readonly string[];
  forbiddenFinalTags: readonly string[];
  candidateFinalRecipes: readonly string[];
  status: 'concept';
  fallbackRecipe: string;
  interpolationAllowed: false;
  rarity: ArtRarity;
}

const segments = [
  { id: 'seg01_03', from: 1, to: 3 }, { id: 'seg03_06', from: 3, to: 6 },
  { id: 'seg06_10', from: 6, to: 10 },
] as const;
const milestones = new Set([3, 6, 10]);

const familyBySpecies: Record<ArtSpecies, ArtGrowthFamily> = {
  cat: 'wing_bud_soft', dog: 'horn_bud_branch', frog: 'gill_petal', dragon: 'wing_bud_soft', duck: 'ribbon_wing',
  spirit: 'plush_reshape', bunny: 'tail_branch', fox: 'tail_branch', robot: 'plush_reshape', child: 'plush_reshape', custom: 'plush_reshape',
};
const tagsByFamily: Record<ArtGrowthFamily, readonly string[]> = {
  wing_bud_soft: ['wing_pair', 'soft_outline', 'organic_fold'],
  horn_bud_branch: ['horn_pair', 'rounded_branch', 'organic_fold'],
  gill_petal: ['gill_pair', 'petal_edge', 'organic_fold'],
  ribbon_wing: ['wing_pair', 'ribbon_fold', 'soft_outline'],
  tail_branch: ['tail_anchor', 'rounded_branch', 'organic_fold'],
  plush_reshape: ['body_anchor', 'soft_outline', 'organic_fold'],
};
const forbiddenByFamily: Record<ArtGrowthFamily, readonly string[]> = {
  wing_bud_soft: ['horn_only', 'wing_absent'], horn_bud_branch: ['wing_only', 'horn_absent'],
  gill_petal: ['gill_absent'], ribbon_wing: ['wing_absent'], tail_branch: ['tail_absent'], plush_reshape: ['body_anchor_absent'],
};

function segmentFor(level: number) {
  return segments.find((segment) => level >= segment.from && level <= segment.to) || segments.at(-1)!;
}

function createRecipe(speciesId: ArtSpecies, path: CompanionEvolution['path'], level: number): ArtRecipe {
  const boundedLevel = Number.isFinite(level) ? Math.max(1, Math.min(10, Math.floor(level))) : 1;
  const family = familyBySpecies[speciesId];
  const segment = segmentFor(boundedLevel);
  const continuityTags = tagsByFamily[family];
  const milestone = milestones.has(boundedLevel);
  const baseId = `${speciesId}_${segment.id}_${family}_l${String(boundedLevel).padStart(2, '0')}`;
  const finalBase = `${speciesId}_${segment.id}_${family}_final`;
  return {
    id: `${baseId}_v01`, catalogVersion: 'pet-art-v1_1', speciesId, path, level: boundedLevel, segmentId: segment.id,
    growthFamilyId: family, continuityTags, requiredFinalTags: continuityTags.slice(0, 2), forbiddenFinalTags: forbiddenByFamily[family],
    candidateFinalRecipes: milestone ? [`${finalBase}_common`, `${finalBase}_${path}`, `${finalBase}_rare`] : [], status: 'concept',
    fallbackRecipe: `${finalBase}_common`, interpolationAllowed: false, rarity: milestone ? 'final' : 'neutral',
  };
}

/** Preview metadata only; candidate IDs are not production-approved assets or RNG pools. */
export function artRecipeFor(speciesId: ArtSpecies, path: CompanionEvolution['path'], level: number): ArtRecipe {
  return createRecipe(speciesId, path, level);
}

/** Checks preview metadata; visual approval is a separate review step. */
export function validateArtCatalog(): string[] {
  const errors: string[] = [];
  for (const speciesId of Object.keys(familyBySpecies) as ArtSpecies[]) {
    for (const path of ['explorer', 'guardian', 'trickster'] as const) {
      for (let level = 1; level <= 10; level++) {
        const recipe = createRecipe(speciesId, path, level);
        if (!recipe.continuityTags.length) errors.push(`${recipe.id}: missing continuity tags`);
        if (milestones.has(level) && recipe.candidateFinalRecipes.length < 3) errors.push(`${recipe.id}: fewer than three candidate finals`);
        if (recipe.requiredFinalTags.some((tag) => recipe.forbiddenFinalTags.includes(tag))) errors.push(`${recipe.id}: final both requires and forbids ${recipe.requiredFinalTags.find((tag) => recipe.forbiddenFinalTags.includes(tag))}`);
      }
    }
  }
  return errors;
}
