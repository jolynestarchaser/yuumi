// Acknowledgments are per profile and browser. Dismissing the dialog marks it read.
export const currentRelease = Object.freeze({
  id: '2026-10-02-illustrated-companions',
  title: 'A fresh look for every companion',
  subtitle: 'Moodboard-inspired illustrated companions, with soft shading and distinct evolution looks.',
  features: [
    {
      icon: 'pet' as const,
      title: '66 illustrated evolution looks',
      description: 'Each species has nature, celestial, and adventurer artwork in compact and agile forms. Saved form IDs select their exact look without rerolling. Robots retain mechanical designs.',
    },
    {
      icon: 'pet' as const,
      title: 'Your progress stays yours',
      description: 'Species, age, memories, and saved evolution data stay intact. This illustration pass uses authored colors and wardrobe; saved customization preferences remain preserved while layered artwork is developed.',
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
      title: 'Still moving, still your companion',
      description: 'Illustrated cutouts breathe, hop, waddle, march, or float with species-specific timing. Age changes size and cadence independently of evolution. Animation-off and reduced motion remain supported; articulated limbs and evolving facial animation need layered rigs.',
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
