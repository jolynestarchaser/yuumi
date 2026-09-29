import type { CompanionAppearance, CompanionForm, CompanionSpecies, Temperament } from '../../../../shared/contracts.js';

export const creationSteps = ['Your companion', 'Their world', 'Personality', 'Little details', 'Colors', 'Voice'] as const;

export function formForSpecies(species: CompanionSpecies): CompanionForm {
  if (species === 'child') return 'child';
  return ['bunny', 'cat', 'fox', 'dragon'].includes(species) ? 'pet' : 'creature';
}

export function creationSeed(appearance: CompanionAppearance, temperament: Temperament, detail: string) {
  const species = appearance.species === 'custom' ? appearance.customDescription?.trim() || 'little creature' : appearance.species || 'spirit';
  const world = (appearance.world || 'moon-garden').replaceAll('-', ' ');
  const face = appearance.face || 'gentle';
  const shape = appearance.silhouette || 'round';
  const extra = detail.trim().slice(0, 180);
  return `A ${species} from the ${world}. ${temperament}, with a ${face} face and ${shape} shape.${extra ? ` ${extra}` : ''}`.slice(0, 500);
}
