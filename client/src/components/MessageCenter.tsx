import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, Heart, ImagePlus, Mail, Music2, Paperclip, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuthStore } from '../store/authStore.js';
import { useDesktopStore } from '../store/desktopStore.js';
import GlassDialog from './GlassDialog.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { iconCatalog, iconComponents } from '../lib/iconCatalog.js';
import type { MessageDraft, MessageAnimation } from '../../../shared/contracts.js';
import {
  LETTER_EFFECTS,
  createCelebrationParticles,
  getNextUnreadMessage,
  playLetterChime,
  resolveLetterEffect
} from '../lib/letterEffects.js';

const DEFAULT_FORM: Readonly<MessageDraft> = Object.freeze({
  subject: '',
  body: '',
  kind: 'letter',
  icon: 'heart',
  accentColor: '#ff8fa5',
  emoji: '💌',
  animation: 'hearts'
});

const messageIconKeys = new Set(['heart', 'star', 'sparkles', 'bell', 'gift', 'music', 'cloud', 'coffee', 'sun', 'rocket', 'game', 'idea', 'message', 'palette']);
const messageIconOptions = iconCatalog.filter(({ key }) => messageIconKeys.has(key));
const effectIconNames = Object.freeze({ none: 'message', hearts: 'heart', sparkles: 'sparkles', 'emoji-rain': 'palette', confetti: 'gift', bubbles: 'cloud', stars: 'star' });

const recipientFor = (profile) => profile === 'joe' ? 'focus' : 'joe';
const profileName = (profile) => profile === 'joe' ? 'Joe' : 'Focus';

function readSoundPreference() {
  try {
    return globalThis.localStorage?.getItem('letter-sound-enabled') !== 'false';
  } catch {
    return true;
  }
}

function MessageMark({ icon, emoji, accentColor, size = 22, className = '' }: { icon: string; emoji?: string; accentColor: string; size?: number; className?: string }) {
  const Icon = iconComponents[icon];
  if (!Icon) return <span className={`legacy-message-emoji ${className}`}>{emoji || '💌'}</span>;
  return <Icon className={`message-mark ${className}`} size={size} strokeWidth={2.15} fill={icon === 'heart' ? 'currentColor' : 'none'} style={{ color: accentColor || '#ff8fa5' }} aria-hidden='true' />;
}

function EffectOrbit({ animation, emoji, accentColor }) {
  const effect = resolveLetterEffect(animation, emoji);
  if (!effect.glyphs.length) return null;
  return <div className={`letter-orbit ${effect.name}`} style={{ '--letter-accent': accentColor || '#ff8fa5' }} aria-hidden='true'>
    {effect.glyphs.slice(0, 5).map((glyph, index) => <span key={`${glyph}-${index}`} style={{ '--i': index }}>{glyph}</span>)}
  </div>;
}

function MessageAttachment({ attachment, compact = false }) {
  if (!attachment) return null;
  if (attachment.kind === 'image') return <figure className={`message-attachment image ${compact ? 'compact' : ''}`}><img src={attachment.secureUrl} alt={attachment.name || 'Attached image'} /></figure>;
  return <section className={`message-attachment audio ${compact ? 'compact' : ''}`}><div><Music2 size={18} /><span>{attachment.name || 'Attached music'}</span></div><audio controls preload='metadata' src={attachment.secureUrl}>Your browser cannot play this audio file.</audio></section>;
}

function CelebrationLayer({ message, visible }) {
  const particles = useMemo(() => createCelebrationParticles({
    effect: message?.animation,
    emoji: message?.emoji,
    count: 22
  }), [message?._id, message?.animation, message?.emoji]);
  if (!visible || !particles.length) return null;
  return <div className={`letter-celebration effect-${message.animation}`} style={{ '--letter-accent': message.accentColor || '#ff8fa5' }} aria-hidden='true'>
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

export default function MessageCenter({ suspended = false }) {
  const profile = useAuthStore((state) => state.profile);
  const messages = useDesktopStore((state) => state.messages);
  const unread = useDesktopStore((state) => state.unreadMessages);
  const fetchMessages = useDesktopStore((state) => state.fetchMessages);
  const sendMessage = useDesktopStore((state) => state.sendMessage);
  const uploadMessageAttachment = useDesktopStore((state) => state.uploadMessageAttachment);
  const markRead = useDesktopStore((state) => state.markMessageRead);
  const pushToast = useDesktopStore((state) => state.pushToast);
  const [open, setOpen] = useState(false);
  const [compose, setCompose] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [ready, setReady] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => new Set());
  const [celebrating, setCelebrating] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const played = useRef(new Set());
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    // A profile switch starts a new notification session; do not carry
    // dismissed/chime bookkeeping from the previous user into this inbox.
    played.current.clear();
  }, [profile]);

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
    () => ready && !open && !suspended ? getNextUnreadMessage(messages, dismissedIds) : null,
    [dismissedIds, messages, open, ready, suspended]
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
    if ((!form.body.trim() && !attachmentFile) || sending) return;
    setSending(true);
    setFormError('');
    try {
      const attachment = attachmentFile ? await uploadMessageAttachment(attachmentFile) : null;
      await sendMessage({
        ...form,
        attachment,
        recipient: recipientFor(profile),
        operationId: `${profile}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
      });
      setForm({ ...DEFAULT_FORM });
      setAttachmentFile(null);
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
      <Input aria-label='หัวข้อจดหมาย' placeholder='หัวข้อจดหมาย' maxLength={120} value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} />
      <Textarea aria-label='ข้อความ' placeholder='เขียนข้อความถึงอีกคน…' maxLength={5000} value={form.body} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} />
      <div className='message-attachment-picker'>
        <label className='attachment-button'><Paperclip size={15} /> แนบรูป GIF หรือเพลง<input aria-label='แนบรูป GIF หรือเพลง' type='file' accept='image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/x-m4a' onChange={(event) => { const [file] = event.target.files; if (file) setAttachmentFile(file); event.target.value = ''; }} /></label>
        {attachmentFile && <div className='attachment-file'><span>{attachmentFile.type.startsWith('image/') ? <ImagePlus size={15} /> : <Music2 size={15} />}{attachmentFile.name}</span><button type='button' aria-label='ลบไฟล์แนบ' onClick={() => setAttachmentFile(null)}><X size={14} /></button></div>}
      </div>
      <div className='message-symbol-heading'><span>สัญลักษณ์ประจำจดหมาย</span><strong><MessageMark icon={form.icon} accentColor={form.accentColor} size={17} /> สีที่เลือก</strong></div>
      <div className='message-icon-picker' aria-label='เลือกไอคอนจดหมาย'>
        {messageIconOptions.map(({ key, label }) => <button type='button' key={key} className={form.icon === key ? 'active' : ''} style={{ '--message-accent': form.accentColor }} title={label} aria-label={label} onClick={() => setForm((value) => ({ ...value, icon: key }))}><MessageMark icon={key} accentColor={form.accentColor} size={20} /></button>)}
      </div>
      <label className='accent-color-field'>สี icon <span><input aria-label='เลือกสี icon' type='color' value={form.accentColor} onChange={(event) => setForm((value) => ({ ...value, accentColor: event.target.value }))} /><output>{form.accentColor}</output></span></label>
      <div className='effect-heading'><span>บรรยากาศตอนเปิด</span><strong><MessageMark icon={effectIconNames[form.animation]} accentColor={form.accentColor} size={17} /> {effect.label}</strong></div>
      <div className='effect-picker'>
        {Object.entries(LETTER_EFFECTS).map(([name, option]) => <button type='button' key={name} className={form.animation === name ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, animation: name as MessageAnimation }))}>
          <span><MessageMark icon={effectIconNames[name]} accentColor={form.accentColor} size={20} /></span><small>{option.label}</small>
        </button>)}
      </div>
      {formError && <p className='form-error' role='alert'>{formError}</p>}
      <div className='dialog-actions'><Button variant='secondary' onClick={() => { setCompose(false); setFormError(''); setAttachmentFile(null); }}>ยกเลิก</Button><Button variant='neon' type='submit' disabled={sending}><Send size={14} /> {sending ? 'กำลังส่ง…' : `ส่งถึง ${profileName(recipientFor(profile))}`}</Button></div>
    </form> : <div className='mailbox-layout'>
      <div className='message-list' aria-label='Inbox'>
        {messages.length ? messages.map((message) => <button className={`message-row ${message.readAt ? '' : 'unread'} ${selected?._id === message._id ? 'selected' : ''}`} key={message._id} onClick={() => openMessage(message)}>
          <span className='message-emoji'><MessageMark {...message} /></span>
          <span className='message-row-copy'><strong>{message.subject || 'A special message'} {message.attachment && <Paperclip className='message-row-attachment' size={12} />}</strong><small>จาก {profileName(message.sender)} · {new Date(message.createdAt).toLocaleString()}</small><span>{message.body || (message.attachment?.kind === 'audio' ? 'เพลงที่แนบมา' : 'รูปที่แนบมา')}</span></span>
        </button>) : <p className='empty-mailbox'><Sparkles size={22} /> ยังไม่มีข้อความ<br /><small>ลองเขียนฉบับแรกถึง {profileName(recipientFor(profile))}</small></p>}
      </div>
      <article className={`message-detail ${selected ? 'has-message' : ''}`}>
        {selected ? <><EffectOrbit animation={selected.animation} emoji={selected.emoji} accentColor={selected.accentColor} /><p className='eyebrow'>{selected.kind === 'alert' ? 'Special alert' : `From ${profileName(selected.sender)}`}</p><div className='detail-emoji'><MessageMark {...selected} size={31} /></div><h3>{selected.subject || 'A special message'}</h3>{selected.body && <p>{selected.body}</p>}<MessageAttachment attachment={selected.attachment} /></> : <><Mail size={30} /><strong>เลือกจดหมายเพื่อเปิดอ่าน</strong><small>ข้อความใหม่จะมีขอบสี Neon</small></>}
      </article>
    </div>}
  </GlassDialog> : null;

  const incoming = nextUnread && !open ? createPortal(<>
    <CelebrationLayer message={nextUnread} visible={celebrating} />
    <button type='button' className='incoming-letter-backdrop' onClick={dismissIncoming} aria-label='ไว้เปิดทีหลัง' />
    <motion.aside className={`incoming-letter glass-dialog kind-${nextUnread.kind}`} style={{ '--incoming-accent': nextUnread.accentColor || '#ff8fa5' }} role='alertdialog' aria-modal='true' aria-label={`ข้อความจาก ${profileName(nextUnread.sender)}`} initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.86, x: '-50%', y: '-46%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 28 }}>
      <div className='incoming-windowbar' aria-hidden='true'><span><i /><i /><i /></span><b>Yuu & Mi message</b></div>
      <EffectOrbit animation={nextUnread.animation} emoji={nextUnread.emoji} accentColor={nextUnread.accentColor} />
      <div className='incoming-letter-heading'>
        <span className='incoming-envelope'><MessageMark {...nextUnread} size={46} /></span>
        <div><p className='eyebrow'>{nextUnread.kind === 'alert' ? 'ข้อความพิเศษมาถึง' : 'มีจดหมายมาถึง'}</p><small>จาก {profileName(nextUnread.sender)}</small></div>
      </div>
      <h3>{nextUnread.subject || 'A little note for you'}</h3>
      <p className='incoming-copy'>{nextUnread.body}</p>
      {nextUnread.attachment && <div className='incoming-attachment'><Paperclip size={13} /> {nextUnread.attachment.kind === 'audio' ? 'มีเพลงแนบมา' : 'มีรูป/GIF แนบมา'}</div>}
      <div className='incoming-actions'><button type='button' onClick={dismissIncoming}>ไว้ทีหลัง</button><button type='button' className='primary' onClick={openIncoming}>เปิดอ่าน <Sparkles size={14} /></button></div>
    </motion.aside>
  </>, document.body) : null;

  return <>
    <button className='message-button' title='Letters and alerts' aria-label={`Letters and alerts, ${unread} unread`} onClick={() => { setOpen((value) => !value); setCompose(false); setSelected(null); }}><Mail size={15} />{unread > 0 && <b>{unread}</b>}</button>
    {mailbox}
    {incoming}
  </>;
}
