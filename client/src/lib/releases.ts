// Acknowledgments are per profile and browser. Dismissing the dialog marks it read.
export const currentRelease = Object.freeze({
  id: '2026-10-02-layered-companions',
  title: 'A fresh look for every companion',
  subtitle: 'Layered faces, moving limbs, and visible saved growth for every species.',
  features: [
    {
      icon: 'pet' as const,
      title: '66 illustrated evolution looks',
      description: 'Each species has nature, celestial, and adventurer artwork in compact and agile forms. Saved form IDs select their exact look without rerolling. Robots retain mechanical designs.',
    },
    {
      icon: 'pet' as const,
      title: 'Your progress stays yours',
      description: 'Saved anatomy and precursor detail IDs now grow coherent illustrated attachments. Species and age stay independent of evolution. Every new saved precursor ID adds growth, without client rerolls.',
    },
    {
      icon: 'pet' as const,
      title: 'Meet all 11 species',
      description: 'Forest spirit, bunny, cat, dog, frog, duck, fox, dragon, robot, storybook child, and the custom cloud base now use softly shaded, textured illustrations throughout companion views.',
    },
    {
      icon: 'pet' as const,
      title: 'A new companion hub',
      description: 'Care, chat, memories, design, and personality each have their own workspace. A compact companion switcher and clear navigation replace the crowded split view. Animated previews keep their own space.',
    },
    {
      icon: 'pet' as const,
      title: 'Smiles, chirps, and little steps',
      description: 'Separate eyes and mouths show smiles and sleepy expressions. Talking mouths follow creature chirps, while individual legs move with species-specific gaits. Animation-off and reduced motion remain supported.',
    },
  ],
});

const storageKey = (profile: string) => `yuu-mi:last-update:${profile}`;
export function hasUnseenRelease(profile: string, storage?: Pick<Storage, 'getItem'>) {
  try { return (storage ?? globalThis.localStorage).getItem(storageKey(profile)) !== currentRelease.id; } catch { return true; }
}
export function acknowledgeRelease(profile: string, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(storageKey(profile), currentRelease.id); } catch { /* A blocked store should not trap the user in the dialog. */ }
}
