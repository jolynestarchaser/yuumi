import type { CompanionSpecies, PublicCompanion } from '../../../../shared/contracts.js';

const speciesWords: Record<CompanionSpecies, [string, string]> = {
  spirit: ['The leaves are whispering today.', 'I found a quiet corner of our world.'],
  bunny: ['A little hop, then a little pause.', 'Could we see what is beyond that flower?'],
  cat: ['I am keeping an eye on this sunny spot.', 'Perhaps I will follow you for a while.'],
  fox: ['I have a tiny idea for our next walk.', 'What do you think is around that corner?'],
  dragon: ['I can guard this little path.', 'One brave step at a time.'],
  robot: ['Walk check: all systems curious.', 'I have mapped a new corner to explore.'],
  child: ['I made up a new little adventure.', 'Shall we find a story outside?'],
  custom: ['I wonder what we will find today.', 'This little world still surprises me.'],
};

export function roamingWords(companion: PublicCompanion, turn: number): string {
  if (companion.mood === 'sleepy' || companion.needs.energy < 35) return 'A cozy nap sounds lovely. I’ll rest here.';
  if (companion.needs.fullness < 40) return 'A little snack would be nice when you have time.';
  const actions = companion.careSummary?.actions;
  if (actions && actions.play >= 3 && actions.play > actions.cuddle && companion.traits.playfulness >= 60)
    return ['Shall we invent a tiny game?', 'I bet I can hop over an imaginary cloud!'][turn % 2];
  if (actions && actions.cuddle >= 3 && actions.cuddle >= actions.play && companion.traits.affection >= 60)
    return ['It’s cozy being here with you two.', 'I’m saving a little imaginary hug for Joe and Focus.'][turn % 2];
  const species = companion.appearance?.species || (companion.form === 'pet' ? 'bunny' : companion.form === 'child' ? 'child' : 'spirit');
  return speciesWords[species][turn % 2];
}

export function roamingDuration(companion: PublicCompanion): number {
  const species = companion.appearance?.species || 'spirit';
  const gait: Partial<Record<CompanionSpecies, number>> = { bunny: -1, fox: -1, dragon: 2, robot: 1, cat: 1 };
  return Math.max(5, Math.min(11, 8 + (gait[species] || 0) - (companion.traits.playfulness - 50) / 30));
}
