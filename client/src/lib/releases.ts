// Bump id when shipping user-visible changes. Acknowledgments are per profile
// and browser; never mark an update read just because a dialog mounted.
export const currentRelease = Object.freeze({
  id: '2026-09-19-companion-lifecycle-generations',
  title: 'วงจรชีวิตและทายาทของเพื่อนตัวน้อย',
  subtitle: 'การดูแลไม่จำกัด สุขภาพ การพักผ่อนในวัยชรา และสายเลือดทายาทรุ่นต่อไป',
  features: [
    {
      icon: 'pet' as const,
      title: 'การดูแลไม่จำกัดและระบบสุขภาพ',
      description: 'ยกเลิกขีดจำกัด EXP รายวัน เพิ่มการดูแลความสะอาด ป้อนยาเมื่อป่วย และระบบปกป้องน้องเมื่อเราไม่อยู่'
    },
    {
      icon: 'pixel' as const,
      title: 'วัยชราและการสืบทอดสายเลือด',
      description: 'น้องจะเติบโตสู่วัยชราพร้อมมงกุฎแห่งปัญญา สามารถให้น้องพักผ่อนอย่างสงบในสวนความทรงจำ และฟักไข่ทายาทรุ่นต่อไปเพื่อสืบทอดสายเลือด'
    }
  ]
});

const storageKey = (profile: string) => `yuu-mi:last-update:${profile}`;
export function hasUnseenRelease(profile: string, storage?: Pick<Storage, 'getItem'>) {
  try { return (storage ?? globalThis.localStorage).getItem(storageKey(profile)) !== currentRelease.id; } catch { return true; }
}
export function acknowledgeRelease(profile: string, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? globalThis.localStorage).setItem(storageKey(profile), currentRelease.id); } catch { /* A blocked store should not trap the user in the dialog. */ }
}
