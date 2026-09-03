import { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';

export default function LoginPage() {
  const unlock = useAuthStore((state) => state.unlock);
  const [pin, setPin] = useState(''); const [error, setError] = useState('');
  function submit(event) { event.preventDefault(); if (!unlock(pin)) return setError('PIN ไม่ถูกต้อง ลองใหม่อีกครั้ง'); }
  return <main className="login-shell"><section className="login-card"><p className="eyebrow">A private place for two</p><h1>Yuu <span>&</span> Mi</h1><p className="intro">ใส่ PIN 4 หลักเพื่อเปิด shared desktop</p><form onSubmit={submit}><label>Desktop PIN<input type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4}" maxLength="4" required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></label>{error && <p className="form-error">{error}</p>}<button>Open desktop</button></form></section></main>;
}
