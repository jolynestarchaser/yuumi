import type { CareVector, CompanionSpecies, PetCapability, PetGrowthFamily, PetRarity } from '../../../shared/contracts.js';

export const PET_CONFIG_VERSION = 'pet-balance-v1.1';
export const PET_CATALOG_VERSION = 'pet-svg-v1.1';
export const PET_RNG_VERSION = 'hmac-sha256-53-v1';
export const LIVE_LEVEL_CAP: number | null = null;
export const CARE_AXES = ['affection', 'play', 'curiosity', 'calm', 'nature', 'balance'] as const;
export const SEGMENTS = [{ from: 1, to: 3 }, { from: 3, to: 6 }, { from: 6, to: 10 }] as const;
export const vector = (values: number[]): CareVector => Object.fromEntries(CARE_AXES.map((axis, i) => [axis, values[i] || 0])) as CareVector;

export interface PetFamilySpec {
  id: PetGrowthFamily; affinity: CareVector; capability: PetCapability;
  variants: { id: string; variant: 'soft' | 'petal' | 'star' | 'basic'; tier: PetRarity; affinity: CareVector }[];
}
const motifs = [
  { variant: 'soft' as const, affinity: vector([.5, 0, 0, .5, 0, 0]) },
  { variant: 'petal' as const, affinity: vector([0, 0, .1, .2, .6, .1]) },
  { variant: 'star' as const, affinity: vector([0, .5, .4, 0, 0, .1]) },
];
// Every tier offers care-sensitive choices, including Common. Tier is not power.
const variants: PetFamilySpec['variants'] = [
  ...(['common', 'uncommon', 'rare'] as const).flatMap((tier) => motifs.map((motif) => ({ ...motif, id: `${motif.variant}_${tier}`, tier }))),
  { id: 'basic', variant: 'basic', tier: 'common', affinity: vector([0, 0, 0, 0, 0, 1]) },
];
export const FAMILIES: Record<PetGrowthFamily, PetFamilySpec> = {
  tail: { id: 'tail', affinity: vector([.3, .3, .1, 0, .2, .1]), capability: 'greeting', variants },
  crest: { id: 'crest', affinity: vector([.1, .2, .1, .3, .2, .1]), capability: 'greeting', variants },
  paws: { id: 'paws', affinity: vector([.1, .4, .3, 0, .1, .1]), capability: 'grasp', variants },
  wings: { id: 'wings', affinity: vector([.35, .1, .15, .3, .05, .05]), capability: 'float', variants },
  horns: { id: 'horns', affinity: vector([0, .3, .35, .05, .25, .05]), capability: 'sense', variants },
  gills: { id: 'gills', affinity: vector([.05, .05, .1, .3, .45, .05]), capability: 'water', variants },
};

export function familiesFor(species: CompanionSpecies, toLevel: number): PetGrowthFamily[] {
  if (toLevel === 3) return [species === 'frog' || species === 'duck' ? 'crest' : 'tail'];
  if (toLevel === 6) return ['paws'];
  if (toLevel === 10) return species === 'frog' || species === 'duck' ? ['wings', 'horns', 'gills'] : ['wings', 'horns'];
  return [];
}
export const recipeId = (species: CompanionSpecies, family: PetGrowthFamily, level: number, variant: string) => `${species}_${family}_${level}_${variant}_v1.1`;
export function validatePetCatalog() {
  for (const species of ['cat', 'dog', 'frog', 'dragon', 'duck'] as const) {
    for (const segment of SEGMENTS) {
      for (const family of familiesFor(species, segment.to)) {
        const spec = FAMILIES[family];
        if (!spec || spec.variants.length < 4 || !spec.variants.some((entry) => entry.id === 'basic')) throw new Error(`Incomplete catalog: ${species}/${family}`);
        if (Math.abs(Object.values(spec.affinity).reduce((a, b) => a + b, 0) - 1) > 1e-8) throw new Error(`Invalid affinity: ${family}`);
      }
    }
  }
  return true;
}

export function xpThreshold(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) throw new Error('Invalid pet level.');
  const threshold = 100 * (level - 1) + 12.5 * (level - 1) * (level - 2);
  if (!Number.isSafeInteger(threshold)) throw new Error('Pet XP threshold overflow.');
  return threshold;
}
export function petLevel(xp: number, legacyLevel: number | null = null): number {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error('Invalid pet XP.');
  if (legacyLevel !== null && (!Number.isSafeInteger(legacyLevel) || legacyLevel < 1)) throw new Error('Invalid legacy pet level.');
  let level = Math.floor(2 * xp / (87.5 + Math.sqrt(87.5 * 87.5 + 50 * xp))) + 1;
  // At most two corrections handle floating-point rounding at exact boundaries.
  for (let i = 0; i < 2 && xpThreshold(level) > xp; i++) level--;
  for (let i = 0; i < 2 && xpThreshold(level + 1) <= xp; i++) level++;
  level = Math.max(level, legacyLevel || 1);
  xpThreshold(level + 1); // Overflow is an integrity failure, never a gameplay cap.
  return level;
}
