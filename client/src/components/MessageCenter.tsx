import { useI18n, getLocale, translate as t } from '../lib/i18n.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BellRing, Heart, ImagePlus, Languages, Mail, Music2, Paperclip, Send, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuthStore } from '../store/authStore.js';
import { useDesktopStore } from '../store/desktopStore.js';
import GlassDialog from './GlassDialog.js';
import { Button } from './ui/button.js';
import { Input } from './ui/input.js';
import { Textarea } from './ui/textarea.js';
import { iconCatalog, iconComponents } from '../lib/iconCatalog.js';
import { useTranslation } from '../hooks/useTranslation.js';
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
  useI18n();
  const Icon = iconComponents[icon];
  if (!Icon) return <span className={`legacy-message-emoji ${className}`}>{emoji || '💌'}</span>;
  return <Icon className={`message-mark ${className}`} size={size} strokeWidth={2.15} fill={icon === 'heart' ? 'currentColor' : 'none'} style={{ color: accentColor || '#ff8fa5' }} aria-hidden='true' />;
}

function EffectOrbit({ animation, emoji, accentColor }) {
  useI18n();
  const effect = resolveLetterEffect(animation, emoji);
  if (!effect.glyphs.length) return null;
  return <div className={`letter-orbit ${effect.name}`} style={{ '--letter-accent': accentColor || '#ff8fa5' }} aria-hidden='true'>
    {effect.glyphs.slice(0, 5).map((glyph, index) => <span key={`${glyph}-${index}`} style={{ '--i': index }}>{glyph}</span>)}
  </div>;
}

function MessageAttachment({ attachment, compact = false }) {
  useI18n();
  if (!attachment) return null;
  if (attachment.kind === 'spotify') return <section className={`message-attachment spotify ${compact ? 'compact' : ''}`}><div><Music2 size={18} /><span>{attachment.name || t("Spotify music")}</span></div><iframe title={attachment.name || t("Spotify player")} src={attachment.embedUrl} loading='lazy' allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' /></section>;
  if (attachment.kind === 'image') return <figure className={`message-attachment image ${compact ? 'compact' : ''}`}><img src={attachment.secureUrl} alt={attachment.name || t("Attached image")} /></figure>;
  return <section className={`message-attachment audio ${compact ? 'compact' : ''}`}><div><Music2 size={18} /><span>{attachment.name || t("Attached music")}</span></div><audio controls preload='metadata' src={attachment.secureUrl}>{t("Your browser cannot play this audio file.")}</audio></section>;
}

function CelebrationLayer({ message, visible }) {
  useI18n();
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
  useI18n();
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
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const { translate, translating, translationError, clearTranslationError } = useTranslation();
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
    if ((!form.body.trim() && !attachmentFile && !spotifyUrl.trim()) || sending) return;
    setSending(true);
    setFormError('');
    try {
      const attachment = attachmentFile ? await uploadMessageAttachment(attachmentFile) : spotifyUrl.trim() ? { kind: 'spotify' as const, spotifyUrl: spotifyUrl.trim() } : null;
      await sendMessage({
        ...form,
        attachment,
        recipient: recipientFor(profile),
        operationId: `${profile}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
      });
      setForm({ ...DEFAULT_FORM });
      setAttachmentFile(null);
      setSpotifyUrl('');
      setCompose(false);
      pushToast(t('Sent to {name} ✦', { name: profileName(recipientFor(profile)) }));
      playLetterChime({ enabled: soundEnabled }).catch(() => {});
    } catch (error) {
      setFormError(error.response?.data?.error?.message ?? 'ส่งข้อความไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      setSending(false);
    }
  }

  async function translateCompose(target) {
    const translated = await translate(form.body, target);
    if (translated) setForm((value) => ({ ...value, body: translated }));
  }

  const effect = resolveLetterEffect(form.animation, form.emoji);
  const mailbox = open ? <GlassDialog
    title={<><Mail size={20} /> {t("Letters & alerts")}</>}
    eyebrow={t("{value0}'s mailbox · {value1} unread", { value0: profileName(profile), value1: unread })}
    className='message-dialog'
    onClose={() => { setOpen(false); setCompose(false); }}
  >
    <div className='message-commandbar'>
      <button type='button' className='sound-toggle' onClick={toggleSound} aria-pressed={soundEnabled}>
        {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />} {t("เสียง")} {soundEnabled ? t("เปิด") : t("ปิด")}
      </button>
      <button type='button' className='primary compact-primary' onClick={() => { setSelected(null); setCompose(true); }}>
        <Heart size={15} /> {t("เขียนถึง")} {profileName(recipientFor(profile))}
      </button>
    </div>

    {compose ? <form className='message-compose' onSubmit={submit}>
      <div className='message-kind-picker' aria-label={t("Message type")}>
        <button type='button' className={form.kind === 'letter' ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, kind: 'letter' }))}><Mail size={15} /> {t("จดหมาย")}</button>
        <button type='button' className={form.kind === 'alert' ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, kind: 'alert' }))}><BellRing size={15} /> {t("ข้อความด่วน")}</button>
      </div>
      <Input aria-label={t("หัวข้อจดหมาย")} placeholder={t("หัวข้อจดหมาย")} maxLength={120} value={form.subject} onChange={(event) => setForm((value) => ({ ...value, subject: event.target.value }))} />
      <Textarea aria-label={t("ข้อความ")} placeholder={t("เขียนข้อความถึงอีกคน…")} maxLength={5000} value={form.body} onChange={(event) => setForm((value) => ({ ...value, body: event.target.value }))} />
      <div className='translation-actions' aria-label={t("Translate message")}><span><Languages size={14} /> {t("แปลข้อความ")}</span><button type='button' disabled={!form.body.trim() || translating} onClick={() => translateCompose('th')}>{t("เป็นไทย")}</button><button type='button' disabled={!form.body.trim() || translating} onClick={() => translateCompose('en')}>{t("To English")}</button></div>
      <div className='message-attachment-picker'>
        <label className='attachment-button'><Paperclip size={15} /> {t("แนบรูป GIF หรือเพลง")}<input aria-label={t("แนบรูป GIF หรือเพลง")} type='file' accept='image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/x-m4a' onChange={(event) => { const [file] = event.target.files; if (file) { setAttachmentFile(file); setSpotifyUrl(''); } event.target.value = ''; }} /></label>
        <label className='spotify-attachment-input'><Music2 size={15} /><input aria-label={t("ลิงก์ Spotify")} type='url' placeholder={t("วางลิงก์ Spotify (เพลง / อัลบั้ม / เพลย์ลิสต์)")} value={spotifyUrl} onChange={(event) => { setSpotifyUrl(event.target.value); if (event.target.value) setAttachmentFile(null); }} /></label>
        {attachmentFile && <div className='attachment-file'><span>{attachmentFile.type.startsWith('image/') ? <ImagePlus size={15} /> : <Music2 size={15} />}{attachmentFile.name}</span><button type='button' aria-label={t("ลบไฟล์แนบ")} onClick={() => setAttachmentFile(null)}><X size={14} /></button></div>}
        {spotifyUrl && <div className='attachment-file'><span><Music2 size={15} />{t("Spotify link attached")}</span><button type='button' aria-label={t("ลบลิงก์ Spotify")} onClick={() => setSpotifyUrl('')}><X size={14} /></button></div>}
      </div>
      <div className='message-symbol-heading'><span>{t("สัญลักษณ์ประจำจดหมาย")}</span><strong><MessageMark icon={form.icon} accentColor={form.accentColor} size={17} /> {t("สีที่เลือก")}</strong></div>
      <div className='message-icon-picker' aria-label={t("เลือกไอคอนจดหมาย")}>
        {messageIconOptions.map(({ key, label }) => <button type='button' key={key} className={form.icon === key ? 'active' : ''} style={{ '--message-accent': form.accentColor }} title={t(label)} aria-label={t(label)} onClick={() => setForm((value) => ({ ...value, icon: key }))}><MessageMark icon={key} accentColor={form.accentColor} size={20} /></button>)}
      </div>
      <label className='accent-color-field'>{t("สี icon")} <span><input aria-label={t("เลือกสี icon")} type='color' value={form.accentColor} onChange={(event) => setForm((value) => ({ ...value, accentColor: event.target.value }))} /><output>{form.accentColor}</output></span></label>
      <div className='effect-heading'><span>{t("บรรยากาศตอนเปิด")}</span><strong><MessageMark icon={effectIconNames[form.animation]} accentColor={form.accentColor} size={17} /> {t(effect.label)}</strong></div>
      <div className='effect-picker'>
        {Object.entries(LETTER_EFFECTS).map(([name, option]) => <button type='button' key={name} className={form.animation === name ? 'active' : ''} onClick={() => setForm((value) => ({ ...value, animation: name as MessageAnimation }))}>
          <span><MessageMark icon={effectIconNames[name]} accentColor={form.accentColor} size={20} /></span><small>{t(option.label)}</small>
        </button>)}
      </div>
      {(formError || translationError) && <p className='form-error' role='alert'>{t(formError || translationError)}</p>}
      <div className='dialog-actions'><Button variant='secondary' onClick={() => { setCompose(false); setFormError(''); clearTranslationError(); setAttachmentFile(null); setSpotifyUrl(''); }}>{t("ยกเลิก")}</Button><Button variant='neon' type='submit' disabled={sending}><Send size={14} /> {sending ? t("กำลังส่ง…") : t("ส่งถึง {value0}", { value0: profileName(recipientFor(profile)) })}</Button></div>
    </form> : <div className='mailbox-layout'>
      <div className='message-list' aria-label={t("Inbox")}>
        {messages.length ? messages.map((message) => <button className={`message-row ${message.readAt ? '' : 'unread'} ${selected?._id === message._id ? 'selected' : ''}`} key={message._id} onClick={() => openMessage(message)}>
          <span className='message-emoji'><MessageMark {...message} /></span>
          <span className='message-row-copy'><strong>{message.subject || t("A special message")} {message.attachment && <Paperclip className='message-row-attachment' size={12} />}</strong><small>{t("จาก")} {profileName(message.sender)} · {new Date(message.createdAt).toLocaleString(getLocale())}</small><span>{message.body || (message.attachment?.kind === 'spotify' ? t("เพลงจาก Spotify ที่แนบมา") : message.attachment?.kind === 'audio' ? t("เพลงที่แนบมา") : t("รูปที่แนบมา"))}</span></span>
        </button>) : <p className='empty-mailbox'><Sparkles size={22} /> {t("ยังไม่มีข้อความ")}<br /><small>{t("ลองเขียนฉบับแรกถึง")} {profileName(recipientFor(profile))}</small></p>}
      </div>
      <article className={`message-detail ${selected ? 'has-message' : ''}`}>
        {selected ? <><EffectOrbit animation={selected.animation} emoji={selected.emoji} accentColor={selected.accentColor} /><p className='eyebrow'>{selected.kind === 'alert' ? t("Special alert") : t("From {value0}", { value0: profileName(selected.sender) })}</p><div className='detail-emoji'><MessageMark {...selected} size={31} /></div><h3>{selected.subject || t("A special message")}</h3>{selected.body && <p>{selected.body}</p>}<MessageAttachment attachment={selected.attachment} /></> : <><Mail size={30} /><strong>{t("เลือกจดหมายเพื่อเปิดอ่าน")}</strong><small>{t("ข้อความใหม่จะมีขอบสี Neon")}</small></>}
      </article>
    </div>}
  </GlassDialog> : null;

  const incoming = nextUnread && !open ? createPortal(<>
    <CelebrationLayer message={nextUnread} visible={celebrating} />
    <button type='button' className='incoming-letter-backdrop' onClick={dismissIncoming} aria-label={t("ไว้เปิดทีหลัง")} />
    <motion.aside className={`incoming-letter glass-dialog kind-${nextUnread.kind}`} style={{ '--incoming-accent': nextUnread.accentColor || '#ff8fa5' }} role='alertdialog' aria-modal='true' aria-label={t("ข้อความจาก {value0}", { value0: profileName(nextUnread.sender) })} initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.86, x: '-50%', y: '-46%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 28 }}>
      <div className='incoming-windowbar' aria-hidden='true'><span><i /><i /><i /></span><b>{t("Yuu & Mi message")}</b></div>
      <EffectOrbit animation={nextUnread.animation} emoji={nextUnread.emoji} accentColor={nextUnread.accentColor} />
      <div className='incoming-letter-heading'>
        <span className='incoming-envelope'><MessageMark {...nextUnread} size={46} /></span>
        <div><p className='eyebrow'>{nextUnread.kind === 'alert' ? t("ข้อความพิเศษมาถึง") : t("มีจดหมายมาถึง")}</p><small>{t("จาก")} {profileName(nextUnread.sender)}</small></div>
      </div>
      <h3>{nextUnread.subject || t("A little note for you")}</h3>
      <p className='incoming-copy'>{nextUnread.body}</p>
      {nextUnread.attachment && <div className='incoming-attachment'><Paperclip size={13} /> {nextUnread.attachment.kind === 'spotify' ? t("มีเพลงจาก Spotify แนบมา") : nextUnread.attachment.kind === 'audio' ? t("มีเพลงแนบมา") : t("มีรูป/GIF แนบมา")}</div>}
      <div className='incoming-actions'><button type='button' onClick={dismissIncoming}>{t("ไว้ทีหลัง")}</button><button type='button' className='primary' onClick={openIncoming}>{t("เปิดอ่าน")} <Sparkles size={14} /></button></div>
    </motion.aside>
  </>, document.body) : null;

  return <>
    <button className='message-button' title={t("Letters and alerts")} aria-label={t("Letters and alerts, {value0} unread", { value0: unread })} onClick={() => { setOpen((value) => !value); setCompose(false); setSelected(null); }}><Mail size={15} />{unread > 0 && <b>{unread}</b>}</button>
    {mailbox}
    {incoming}
  </>;
}
