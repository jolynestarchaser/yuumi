// Bump id when shipping user-visible changes. Acknowledgments are per profile
// and browser; never mark an update read just because a dialog mounted.
export const currentRelease = Object.freeze({
  id: '2026-09-17-shared-companion',
  title: 'A little more us.',
  subtitle: 'New ways to share your little world.',
  features: [
    { icon: 'pet', title: 'Raise a companion together', description: 'Create your own character, choose their personality, and make memories with snacks, play, cuddles, and conversation.' },
    { icon: 'pixel', title: 'Pixel-art portraits', description: 'Connect Gemini to imagine your creature in 256 × 256 pixel art, inspired by its character and both of you.' },
    { icon: 'letter', title: 'Letters with a little extra', description: 'Attach a photo, animated GIF, or a song your partner can play when they open your letter or alert.' },
    { icon: 'calendar', title: 'A calendar for our moments', description: 'Keep your important dates and together-since counter in a shared calendar from the dock.' }
  ]
});

const storageKey = (profile) => `yuu-mi:last-update:${profile}`;
export function hasUnseenRelease(profile: string, storage?: Pick<Storage, 'getItem'>) {
  try { return (storage ?? globalThis.localStorage).getItem(storageKey(profile)) !== currentRelease.id; } catch { return true; }
}
export function acknowledgeRelease(profile: string, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(storageKey(profile), currentRelease.id); } catch { /* A blocked store should not trap the user in the dialog. */ }
}
