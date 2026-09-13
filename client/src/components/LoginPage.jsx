import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';

export default function LoginPage() {
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

  if (unlocked && !profile) return <main className="login-shell"><section className="login-card profile-card"><p className="eyebrow">Who is using Yuu & Mi?</p><h1>Choose your space</h1><p className="intro">เลือกชื่อผู้ใช้เพื่อบันทึกประวัติและรับจดหมาย</p><div className="profile-buttons"><button className="profile-joe" disabled={busy} onClick={() => choose('joe')}><span>✦</span> Joe</button><button className="profile-focus" disabled={busy} onClick={() => choose('focus')}><span>◈</span> Focus</button></div>{error && <p className="form-error">{error}</p>}<button className="subtle-button" onClick={logout}>กลับไปใส่ PIN</button></section></main>;
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">A private place for two</p><h1>Yuu <span>&</span> Mi</h1><p className="intro">ใส่ PIN 4 หลักเพื่อเปิด shared desktop</p><form onSubmit={submit}><label>Desktop PIN<input type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4}" maxLength="4" required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>{error && <p className="form-error">{error}</p>}<button disabled={busy}>{busy ? 'กำลังตรวจสอบ…' : 'Open desktop'}</button></form></section></main>;
}
