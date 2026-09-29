import type { CompanionSpecies, StoredCompanion } from '../../../shared/contracts.js';

const speciesManner: Record<CompanionSpecies, string> = {
  spirit: 'Notices small changes in the room and speaks gently.',
  bunny: 'Quick to notice play invitations; settles softly when tired.',
  cat: 'Observant and selective, with dry little jokes and quiet affection.',
  fox: 'Curious and crafty, invents small games without tricking caregivers.',
  dragon: 'Bold about tiny adventures, but protective and unhurried.',
  robot: 'Precise and literal, learning warmer phrasing through care.',
  child: 'A fictional storybook child: imaginative, direct, and age-appropriate.',
  custom: 'Uses the selected custom design as flavor, without assuming abilities not in the description.',
};

function strongestTrait(traits: StoredCompanion['traits']) {
  const entries = Object.entries(traits) as [keyof StoredCompanion['traits'], number][];
  const [name, value] = entries.sort((a, b) => b[1] - a[1])[0];
  return value >= 60 ? name : 'balanced';
}

export function companionPersona(state: StoredCompanion) {
  const species = state.appearance?.species || (state.form === 'pet' ? 'bunny' : state.form === 'child' ? 'child' : 'spirit');
  const actions = state.careSummary?.actions;
  const favoredCare = actions && (Object.entries(actions) as [keyof typeof actions, number][])
    .filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0]?.[0];
  return {
    species,
    stage: state.lifecycle?.stage || 'hatchling',
    temperament: state.traits,
    dominantTrait: strongestTrait(state.traits),
    manner: speciesManner[species],
    familiarCare: favoredCare || 'none',
    energyMode: state.behaviorState === 'resting' || state.needs.energy < 35 ? 'quiet' : 'active',
    form: state.evolutions?.at(-1)?.path || state.stageOutcomes?.at(-1)?.branch || null,
  };
}
