import type { CompanionGrowthStage, CompanionSpecies } from '../../../../shared/contracts.js';

interface SpeciesArtKit {
  gait: 'stroll' | 'trot' | 'hop' | 'waddle' | 'float' | 'march';
  cycle: number;
  growth: readonly [string, string, string];
  elder: string;
}

/** Visual vocabulary only: never selects an outcome or grants a capability. */
export const speciesArtKits = {
  cat: { gait: 'stroll', cycle: .85, growth: ['Curled tail', 'Velvet paws', 'Feather fans or moon horns'], elder: 'Silver cheek tufts' },
  dog: { gait: 'trot', cycle: .7, growth: ['Wagging tail', 'Sturdy paws', 'Guardian horns or feather wings'], elder: 'Cream muzzle flecks' },
  frog: { gait: 'hop', cycle: 1.3, growth: ['Pond crest', 'Webbed hands', 'Water frills, reed horns or lily wings'], elder: 'Pond freckles' },
  dragon: { gait: 'march', cycle: .95, growth: ['Spade tail', 'Clawed paws', 'Membrane wings or swept horns'], elder: 'Ivory scale accents' },
  duck: { gait: 'waddle', cycle: .8, growth: ['Feather crest', 'Wing tips', 'Flight feathers, reed horns or water frills'], elder: 'Cream feather edging' },
  spirit: { gait: 'float', cycle: 1.7, growth: ['Vine trail', 'Leaf hands', 'Leaf fans or branching antlers'], elder: 'Golden leaf veins' },
  bunny: { gait: 'hop', cycle: 1, growth: ['Cotton tail', 'Soft mitts', 'Petal wings or bud horns'], elder: 'Silver ear tufts' },
  fox: { gait: 'trot', cycle: .65, growth: ['Brush tail', 'Nimble paws', 'Flame fans or swept horns'], elder: 'Cream cheek edging' },
  robot: { gait: 'march', cycle: 1.05, growth: ['Signal cable', 'Articulated grippers', 'Booster fins or sensor arrays'], elder: 'Polished chassis and service badge' },
  child: { gait: 'stroll', cycle: .95, growth: ['Scarf streamer', 'Dexterous mitts', 'Glider cape or star headband'], elder: 'Silver hair streak' },
  custom: { gait: 'float', cycle: 1.45, growth: ['Cloud trail', 'Cloud mitts', 'Cloud sails or crystal horns'], elder: 'Pearlescent cloud marks' },
} as const satisfies Record<CompanionSpecies, SpeciesArtKit>;

export const ageArtStages = {
  hatchling: { scale: .82, rank: 0, cadence: 1.2 },
  child: { scale: .9, rank: 1, cadence: 1.05 },
  juvenile: { scale: .96, rank: 2, cadence: .95 },
  grown: { scale: 1, rank: 3, cadence: 1 },
  elder: { scale: 1, rank: 4, cadence: 1.35 },
} as const satisfies Record<CompanionGrowthStage, { scale: number; rank: number; cadence: number }>;
