// Acknowledgments are per profile and browser. Dismissing the dialog marks it read.
export const currentRelease = Object.freeze({
  id: '2026-10-02-species-growth-kits',
  title: 'A fresh look for every companion',
  subtitle: 'All your little friends, one art style, and a clearer place to make them yours.',
  features: [
    {
      icon: 'pet' as const,
      title: 'Species-specific walking and growth',
      description: 'Companions stroll, hop, waddle, march, or drift. Growth parts fit their species, including robot cables, grippers, and boosters. Age changes proportions and elder details separately from XP.',
    },
    {
      icon: 'pet' as const,
      title: 'Dress them your way',
      description: 'Save outfits, headwear, and hair independently of earned evolution. Robots use chassis covers instead of biological hair. Your companion keeps their age, memories, and progress.',
    },
    {
      icon: 'pet' as const,
      title: 'Meet all 11 species',
      description: 'Forest spirit, bunny, cat, dog, frog, duck, fox, dragon, robot, storybook child, and a custom cloud base now share the same outlined artwork. All appear in creation and character settings.',
    },
    {
      icon: 'pet' as const,
      title: 'A new companion hub',
      description: 'Care, chat, memories, design, and personality each have their own workspace. A compact companion switcher and clear navigation replace the crowded split view. Animated previews keep their own space.',
    },
    {
      icon: 'pet' as const,
      title: 'Still moving, still your companion',
      description: 'Breathing, blinking, care reactions, and growth effects remain. Pixel-art selection is retired; existing companions keep their species, colors, memories, and progress. Animation-off and reduced motion are still supported.',
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
