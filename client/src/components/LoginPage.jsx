import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';

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

  if (unlocked && !profile) return <main className="login-shell"><section className="login-card profile-card"><p className="eyebrow">Who is using Yuu & Mi?</p><h1>Choose your space</h1><p className="intro">เลือกชื่อผู้ใช้เพื่อบันทึกประวัติและรับจดหมาย</p><div className="profile-buttons"><Button className="profile-joe" disabled={busy} onClick={() => choose('joe')}><span>✦</span> Joe</Button><Button className="profile-focus" disabled={busy} onClick={() => choose('focus')}><span>◈</span> Focus</Button></div>{error && <p className="form-error">{error}</p>}<Button variant='ghost' className="subtle-button" onClick={logout}>กลับไปใส่ PIN</Button></section></main>;
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">A private place for two</p><h1>Yuu <span>&</span> Mi</h1><p className="intro">ใส่ PIN 4 หลักเพื่อเปิด shared desktop</p><form onSubmit={submit}><label>Desktop PIN<Input type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4}" maxLength="4" required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>{error && <p className="form-error">{error}</p>}<Button variant='neon' type='submit' disabled={busy}>{busy ? 'กำลังตรวจสอบ…' : 'Open desktop'}</Button></form></section></main>;
}
