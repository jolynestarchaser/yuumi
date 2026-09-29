// Acknowledgments are per profile and browser. Dismissing the dialog marks it read.
export const currentRelease = Object.freeze({
  id: '2026-09-29-companion-creation-and-settings',
  title: 'Meet your companion your way',
  subtitle: 'Pick a creature, give them a world, and watch them take shape.',
  features: [
    {
      icon: 'pixel' as const,
      title: 'Choose your little one',
      description: 'Creature cards replace the overlapping form and species choices. Name your companion while their live preview takes shape.',
    },
    {
      icon: 'pet' as const,
      title: 'Give them a place and personality',
      description: 'Pick a world, a starting temperament, and the face and shape that make them yours. Their world follows them into the habitat.',
    },
    {
      icon: 'pet' as const,
      title: 'Keep making them yours',
      description: 'The character settings now use the same creature, world, detail, color, and voice choices. Preview changes before saving; earned personality and evolution stay intact.',
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
