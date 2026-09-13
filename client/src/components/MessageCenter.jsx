import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, Heart, Mail, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useDesktopStore } from '../store/desktopStore.js';
import GlassDialog from './GlassDialog.jsx';
import {
  LETTER_EFFECTS,
  createCelebrationParticles,
  getNextUnreadMessage,
  playLetterChime,
  resolveLetterEffect
} from '../lib/letterEffects.js';

const DEFAULT_FORM = Object.freeze({
  subject: '',
  body: '',
  kind: 'letter',
  emoji: '💌',
  animation: 'hearts'
});

const recipientFor = (profile) => profile === 'joe' ? 'focus' : 'joe';
const profileName = (profile) => profile === 'joe' ? 'Joe' : 'Focus';

function readSoundPreference() {
  try {
    return globalThis.localStorage?.getItem('letter-sound-enabled') !== 'false';
  } catch {
    return true;
  }
}

function EffectOrbit({ animation, emoji }) {
  const effect = resolveLetterEffect(animation, emoji);
  if (!effect.glyphs.length) return null;
  return <div className={`letter-orbit ${effect.name}`} aria-hidden='true'>
    {effect.glyphs.slice(0, 5).map((glyph, index) => <span key={`${glyph}-${index}`} style={{ '--i': index }}>{glyph}</span>)}
  </div>;
}

function CelebrationLayer({ message, visible }) {
  const particles = useMemo(() => createCelebrationParticles({
    effect: message?.animation,
    emoji: message?.emoji,
    count: 22
  }), [message?._id, message?.animation, message?.emoji]);
  if (!visible || !particles.length) return null;
  return <div className={`letter-celebration effect-${message.animation}`} aria-hidden='true'>
    {particles.map((particle) => <span key={particle.id} style={{
      '--particle-x': `${particle.x}vw`,
      '--particle-delay': `${particle.delay}s`,
      '--particle-duration': `${particle.duration}s`,
      '--particle-drift': `${particle.drift}px`,
      '--particle-scale': particle.scale,
      '--particle-rotation': `${particle.rotation}deg`
    }}>{particle.glyph}</span>)}
  </div>;
}

export default function MessageCenter() {
  const profile = useAuthStore((state) => state.profile);
  const messages = useDesktopStore((state) => state.messages);
  const unread = useDesktopStore((state) => state.unreadMessages);
  const fetchMessages = useDesktopStore((state) => state.fetchMessages);
  const sendMessage = useDesktopStore((state) => state.sendMessage);
  const markRead = useDesktopStore((state) => state.markMessageRead);
  const pushToast = useDesktopStore((state) => state.pushToast);
  const [open, setOpen] = useState(false);
  const [compose, setCompose] = useState(false);
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [celebrating, setCelebrating] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const played = useRef(new Set());

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setSelected(null);
    setDismissedIds(new Set());
    async function loadInbox() {
      try {
        await fetchMessages();
      } catch {
        if (!cancelled) pushToast('โหลดจดหมายไม่สำเร็จ กรุณาลองเปิดกล่องข้อความอีกครั้ง', 'error');
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    loadInbox();
    return () => { cancelled = true; };
  }, [fetchMessages, profile, pushToast]);

  const nextUnread = useMemo(
    () => ready && !open ? getNextUnreadMessage(messages, dismissedIds) : null,
    [dismissedIds, messages, open, ready]
  );

  useEffect(() => {
    if (!nextUnread?._id) {
      setCelebrating(false);
      return undefined;
    }
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    setCelebrating(!reducedMotion && nextUnread.animation !== 'none');
    if (!played.current.has(nextUnread._id)) {
      played.current.add(nextUnread._id);
      playLetterChime({ enabled: soundEnabled }).catch(() => {});
    }
    const timer = globalThis.setTimeout(() => setCelebrating(false), 4300);
    return () => globalThis.clearTimeout(timer);
  }, [nextUnread?._id, nextUnread?.animation, soundEnabled]);

  async function openMessage(message) {
    setSelected(message);
    if (message.readAt) return;
    try {
      const updated = await markRead(message._id);
      setSelected(updated);
    } catch {
      pushToast('ยังบันทึกสถานะว่าอ่านแล้วไม่ได้', 'error');
    }
  }

  async function openIncoming() {
    const message = nextUnread;
    if (!message) return;
    setOpen(true);
    setCompose(false);
    setCelebrating(false);
    await openMessage(message);
  }

  function dismissIncoming() {
    if (!nextUnread?._id) return;
    setDismissedIds((current) => new Set([...current, nextUnread._id]));
    setCelebrating(false);
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      globalThis.localStorage?.setItem('letter-sound-enabled', String(next));
    } catch { /* Private browsing can reject local storage writes. */ }
    if (next) playLetterChime().catch(() => {});
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.body.trim() || sending) return;
    setSending(true);
    setFormError('');
    try {
      await sendMessage({
        ...form,
        recipient: recipientFor(profile),
        operationId: `${profile}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
      });
      setForm({ ...DEFAULT_FORM });
      setCompose(false);
      pushToast(`ส่งถึง ${profileName(recipientFor(profile))} แล้ว ✦`);
      playLetterChime({ enabled: soundEnabled }).catch(() => {});
    } catch (error) {
      setFormError(error.response?.data?.error?.message ?? 'ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setSending(false);
    }
  }

  const effect = resolveLetterEffect(form.animation, form.emoji);
  const mailbox = open ? <GlassDialog
    title={<><Mail size={20} /> Letters & alerts</>}
    eyebrow={`${profileName(profile)}'s mailbox · ${unread} unread`}
    className='message-dialog'
    onClose={() => { setOpen(false); setCompose(false); }}
  >
    <div className='message-commandbar'>
      <button type='button' className='sound-toggle' onClick={toggleSound} aria-pressed={soundEnabled}>
        {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        เสียง {soundEnabled ? 'เปิด' : 'ปิด'}
      </button>
      <button type='button' className='primary compact-primary' onClick={() => { setSelected(null); setCompose(true); }}>
        <Heart size={15} /> เขียนถึง {profileName(recipientFor(profile))}
      </button>
    </div>

    {compose ? <form className='message-compose' onSubmit={submit}>
      <div className='message-kind-picker' aria-label='Message type'>
        <button type='button' className={form.kind === 'letter' ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, kind: 'letter' }))}><Mail size={15} /> จดหมาย</button>
        <button type='button' className={form.kind === 'alert' ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, kind: 'alert' }))}><BellRing size={15} /> ข้อความด่วน</button>
      </div>
      <input aria-label='หัวข้อจดหมาย' placeholder='หัวข้อจดหมาย' maxLength={120} value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} />
      <textarea aria-label='ข้อความ' placeholder='เขียนข้อความถึงอีกคน…' maxLength={5000} required value={form.body} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} />
      <div className='effect-heading'><span>บรรยากาศตอนเปิด</span><strong>{effect.glyphs[0] ?? '—'} {effect.label}</strong></div>
      <div className='effect-picker'>
        {Object.entries(LETTER_EFFECTS).map(([name, option]) => <button type='button' key={name} className={form.animation === name ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, animation: name }))}>
          <span>{option.glyphs[0] ?? '—'}</span><small>{option.label}</small>
        </button>)}
      </div>
      <label className='emoji-field'>Emoji ประจำซอง<input aria-label='Emoji ประจำซอง' value={form.emoji} maxLength={16} onChange={(event) => setForm((value) => ({ ...value, emoji: event.target.value }))} /></label>
      {formError && <p className='form-error' role='alert'>{formError}</p>}
      <div className='dialog-actions'><button type='button' onClick={() => { setCompose(false); setFormError(''); }}>ยกเลิก</button><button className='primary' disabled={sending}><Send size={14} /> {sending ? 'กำลังส่ง…' : `ส่งถึง ${profileName(recipientFor(profile))}`}</button></div>
    </form> : <div className='mailbox-layout'>
      <div className='message-list' aria-label='Inbox'>
        {messages.length ? messages.map((message) => <button className={`message-row ${message.readAt ? '' : 'unread'} ${selected?._id === message._id ? 'selected' : ''}`} key={message._id} onClick={() => openMessage(message)}>
          <span className='message-emoji'>{message.emoji || '💌'}</span>
          <span className='message-row-copy'><strong>{message.subject || 'A special message'}</strong><small>จาก {profileName(message.sender)} · {new Date(message.createdAt).toLocaleString()}</small><span>{message.body}</span></span>
        </button>) : <p className='empty-mailbox'><Sparkles size={22} /> ยังไม่มีข้อความ<br /><small>ลองเขียนฉบับแรกถึง {profileName(recipientFor(profile))}</small></p>}
      </div>
      <article className={`message-detail ${selected ? 'has-message' : ''}`}>
        {selected ? <><EffectOrbit animation={selected.animation} emoji={selected.emoji} /><p className='eyebrow'>{selected.kind === 'alert' ? 'Special alert' : `From ${profileName(selected.sender)}`}</p><div className='detail-emoji'>{selected.emoji || '💌'}</div><h3>{selected.subject || 'A special message'}</h3><p>{selected.body}</p></> : <><Mail size={30} /><strong>เลือกจดหมายเพื่อเปิดอ่าน</strong><small>ข้อความใหม่จะมีขอบสี Neon</small></>}
      </article>
    </div>}
  </GlassDialog> : null;

  const incoming = nextUnread && !open ? createPortal(<>
    <CelebrationLayer message={nextUnread} visible={celebrating} />
    <aside className={`incoming-letter glass-dialog kind-${nextUnread.kind}`} role='alertdialog' aria-label={`ข้อความจาก ${profileName(nextUnread.sender)}`}>
      <button type='button' className='close-dialog' onClick={dismissIncoming} aria-label='ไว้เปิดทีหลัง'><X size={16} /></button>
      <EffectOrbit animation={nextUnread.animation} emoji={nextUnread.emoji} />
      <div className='incoming-letter-heading'>
        <span className='incoming-envelope'>{nextUnread.emoji || '💌'}</span>
        <div><p className='eyebrow'>{nextUnread.kind === 'alert' ? 'ข้อความพิเศษมาถึง' : 'มีจดหมายมาถึง'}</p><small>จาก {profileName(nextUnread.sender)}</small></div>
      </div>
      <h3>{nextUnread.subject || 'A little note for you'}</h3>
      <p className='incoming-copy'>{nextUnread.body}</p>
      <div className='incoming-actions'><button type='button' onClick={dismissIncoming}>ไว้ทีหลัง</button><button type='button' className='primary' onClick={openIncoming}>เปิดอ่าน <Sparkles size={14} /></button></div>
    </aside>
  </>, document.body) : null;

  return <>
    <button className='message-button' title='Letters and alerts' aria-label={`Letters and alerts, ${unread} unread`} onClick={() => { setOpen((value) => !value); setCompose(false); setSelected(null); }}><Mail size={15} />{unread > 0 && <b>{unread}</b>}</button>
    {mailbox}
    {incoming}
  </>;
}
