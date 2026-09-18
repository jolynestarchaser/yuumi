// Bump id when shipping user-visible changes. Acknowledgments are per profile
// and browser; never mark an update read just because a dialog mounted.
export const currentRelease = Object.freeze({
  id: '2026-09-19-letter-attachments',
  title: 'ส่งความรู้สึกถึงกันได้มากขึ้น',
  subtitle: 'แนบสื่อในจดหมายและการแจ้งเตือนได้แล้ว',
  features: [
    { icon: 'letter', title: 'Media in letters and alerts', description: 'Attach a supported image, GIF, audio link, or Spotify track before sending.' }
  ]
});

const storageKey = (profile) => `yuu-mi:last-update:${profile}`;
export function hasUnseenRelease(profile: string, storage?: Pick<Storage, 'getItem'>) {
  try { return (storage ?? globalThis.localStorage).getItem(storageKey(profile)) !== currentRelease.id; } catch { return true; }
}
export function acknowledgeRelease(profile: string, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(storageKey(profile), currentRelease.id); } catch { /* A blocked store should not trap the user in the dialog. */ }
}
