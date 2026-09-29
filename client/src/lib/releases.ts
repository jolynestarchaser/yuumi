// Acknowledgments are per profile and browser. Dismissing the dialog marks it read.
export const currentRelease = Object.freeze({
  id: '2026-09-29-companion-evolution-voice',
  title: 'A companion with more character',
  subtitle: 'New forms, easier care, and a voice that fits who they are.',
  features: [
    {
      icon: 'pixel' as const,
      title: 'Forms that really change',
      description: 'Pixel companions gain a different body shape at levels 3, 6, and 10. Their care path shapes the form; age adds its own details.',
    },
    {
      icon: 'pet' as const,
      title: 'Care is closer',
      description: 'Care actions now sit by their needs. Success feedback clears after a moment, and the home fits narrow screens better.',
    },
    {
      icon: 'pet' as const,
      title: 'Their own way of speaking',
      description: 'Species and the care they receive shape conversation and walking behavior. Tap Listen to hear a device voice tuned for them; you can change or disable it in Appearance.',
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
