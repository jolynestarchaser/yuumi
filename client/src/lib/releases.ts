// Bump id when shipping user-visible changes. Acknowledgments are per profile
// and browser; never mark an update read just because a dialog mounted.
export const currentRelease = Object.freeze({
  id: '2026-09-17-travel-globe',
  title: 'โลกของเราน่ารักขึ้นอีกนิด',
  subtitle: 'เพื่อนตัวน้อยเติบโตไปกับเราสองคน',
  features: [
    { icon: 'pet', title: 'เดินเล่น เติบโต และวิวัฒนาการ', description: 'ให้น้องออกมาเดินบนเดสก์ท็อป สะสม EXP จากการดูแลและคุย แล้ววิวัฒนาการตามสายพันธุ์และบุคลิก' },
    { icon: 'pixel', title: 'แต่งตัวน้องได้ในแบบของเรา', description: 'สลับภาพแบบนุ่มกับพิกเซล เลือกสายพันธุ์ สี และเสียง พร้อมหน้าจอภาษาไทย/English' },
    { icon: 'letter', title: 'Letters with a little extra', description: 'Attach a photo, animated GIF, or a song your partner can play when they open your letter or alert.' },
    { icon: 'calendar', title: 'A calendar for our moments', description: 'Keep your important dates and together-since counter in a shared calendar from the dock.' },
    { icon: 'map', title: 'Our travel globe', description: 'Pin places you want to visit or adventures you have already shared, with little stickers for each memory.' }
  ]
});

const storageKey = (profile) => `yuu-mi:last-update:${profile}`;
export function hasUnseenRelease(profile: string, storage?: Pick<Storage, 'getItem'>) {
  try { return (storage ?? globalThis.localStorage).getItem(storageKey(profile)) !== currentRelease.id; } catch { return true; }
}
export function acknowledgeRelease(profile: string, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(storageKey(profile), currentRelease.id); } catch { /* A blocked store should not trap the user in the dialog. */ }
}
