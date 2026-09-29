// Acknowledgments are per profile and browser. Dismissing the dialog marks it read.
export const currentRelease = Object.freeze({
  id: '2026-09-29-companion-expression-polish',
  title: 'A companion with more character',
  subtitle: 'A softer little friend with expressions and a voice of their own.',
  features: [
    {
      icon: 'pixel' as const,
      title: 'A face for every moment',
      description: 'Your companion now reacts while thinking, exploring, working, celebrating, feeling confused, and resting. Both soft and pixel forms have more expressive faces.',
    },
    {
      icon: 'pet' as const,
      title: 'A cozier home',
      description: 'Needs and care lead the home view, with appearance settings tucked away when you want them. Little arms, blush, and gentle movement make the soft form feel more alive.',
    },
    {
      icon: 'pet' as const,
      title: 'Their own little voice',
      description: 'Short creature chirps now match care, thought, success, confusion, and rest. Chat stays readable as text instead of being spoken aloud. Set the sound level in Appearance.',
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
