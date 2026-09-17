import { useI18n, translate as t } from '../lib/i18n.js';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';

export default function LoginPage() {
  useI18n();
  const { unlocked, profile, busy, unlock, selectProfile, logout } = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setError('');
    if (!(await unlock(pin))) setError('PIN ไม่ถูกต้อง ลองใหม่อีกครั้ง');
  }

  async function choose(value) {
    setError('');
    if (!(await selectProfile(value))) setError('ไม่สามารถเลือกผู้ใช้ได้ กรุณาลองใหม่');
  }

  if (unlocked && !profile) return <main className="login-shell"><section className="login-card profile-card"><p className="eyebrow">{t("Who is using Yuu & Mi?")}</p><h1>{t("Choose your space")}</h1><p className="intro">{t("เลือกชื่อผู้ใช้เพื่อบันทึกประวัติและรับจดหมาย")}</p><div className="profile-buttons"><Button className="profile-joe" disabled={busy} onClick={() => choose('joe')}><span>✦</span> {t("Joe")}</Button><Button className="profile-focus" disabled={busy} onClick={() => choose('focus')}><span>◈</span> {t("Focus")}</Button></div>{error && <p className="form-error">{t(error)}</p>}<Button variant='ghost' className="subtle-button" onClick={logout}>{t("กลับไปใส่ PIN")}</Button></section></main>;
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">{t("A private place for two")}</p><h1>{t("Yuu")} <span>&</span> {t("Mi")}</h1><p className="intro">{t("ใส่ PIN 4 หลักเพื่อเปิด shared desktop")}</p><form onSubmit={submit}><label>{t("Desktop PIN")}<Input type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4}" maxLength={4} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>{error && <p className="form-error">{t(error)}</p>}<Button variant='neon' type='submit' disabled={busy}>{busy ? t("กำลังตรวจสอบ…") : t("Open desktop")}</Button></form></section></main>;
}
