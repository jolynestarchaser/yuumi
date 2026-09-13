import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Mail, Send, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useDesktopStore } from '../store/desktopStore.js';

const recipientFor = (profile) => profile === 'joe' ? 'focus' : 'joe';

function LetterAnimation({ type }) {
  if (type === 'none') return null;
  const glyph = type === 'sparkles' ? '✦' : type === 'emoji-rain' ? '😊' : '♥';
  return <div className={`letter-animation ${type}`} aria-hidden="true">{[0, 1, 2, 3, 4].map((key) => <span key={key} style={{ '--i': key }}>{glyph}</span>)}</div>;
}

export default function MessageCenter() {
  const profile = useAuthStore((state) => state.profile);
  const messages = useDesktopStore((state) => state.messages);
  const unread = useDesktopStore((state) => state.unreadMessages);
  const fetchMessages = useDesktopStore((state) => state.fetchMessages);
  const sendMessage = useDesktopStore((state) => state.sendMessage);
  const markRead = useDesktopStore((state) => state.markMessageRead);
  const [open, setOpen] = useState(false);
  const [compose, setCompose] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ subject: '', body: '', kind: 'letter', emoji: '💌', animation: 'hearts' });
  const dismissed = useRef(new Set());

  useEffect(() => { fetchMessages().catch(() => {}); }, [fetchMessages]);
  const latestUnread = useMemo(() => messages.find((message) => !message.readAt), [messages]);
  useEffect(() => { if (latestUnread && !active && !open && !dismissed.current.has(latestUnread._id)) setActive(latestUnread); }, [latestUnread, active, open]);
  async function openMessage(message) { setActive(message); if (!message.readAt) await markRead(message._id).catch(() => {}); }
  async function submit(event) { event.preventDefault(); if (!form.body.trim()) return; await sendMessage({ ...form, recipient: recipientFor(profile), operationId: `${profile}-${Date.now()}` }); setForm({ subject: '', body: '', kind: 'letter', emoji: '💌', animation: 'hearts' }); setCompose(false); }

  return <>
    <button className="message-button" title="Letters and alerts" onClick={() => { setOpen((value) => !value); setActive(null); }}><Mail size={15} />{unread > 0 && <b>{unread}</b>}</button>
    {active && !open && <aside className="incoming-letter glass-dialog"><button className="close-dialog" onClick={() => { dismissed.current.add(active._id); setActive(null); }}><X size={16} /></button><LetterAnimation type={active.animation} /><p className="eyebrow">A little note for you</p><h3>{active.subject || `From ${active.sender}`}</h3><p>{active.body}</p><button className="primary" onClick={() => { setOpen(true); setActive(null); }}>Open inbox</button></aside>}
    {open && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="glass-dialog message-dialog"><div className="dialog-heading"><div><p className="eyebrow">{profile === 'joe' ? 'Joe' : 'Focus'}'s mailbox</p><h2><Mail size={20} /> Letters & alerts</h2></div><button className="close-dialog" onClick={() => setOpen(false)}><X size={16} /></button></div><div className="message-list">{messages.length ? messages.map((message) => <button className={`message-row ${message.readAt ? '' : 'unread'}`} key={message._id} onClick={() => openMessage(message)}><span>{message.emoji || '💌'}</span><div><strong>{message.subject || 'A special message'}</strong><small>From {message.sender} · {new Date(message.createdAt).toLocaleString()}</small><p>{message.body}</p></div></button>) : <p className="empty-folder">ยังไม่มีข้อความ</p>}</div>{active && <article className="message-detail"><LetterAnimation type={active.animation} /><strong>{active.subject || 'A special message'}</strong><p>{active.body}</p></article>}{compose ? <form className="message-compose" onSubmit={submit}><input placeholder="หัวข้อจดหมาย" maxLength={120} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /><textarea placeholder="เขียนข้อความถึงอีกคน…" maxLength={5000} required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} /><div className="message-options"><select value={form.animation} onChange={(event) => setForm({ ...form, animation: event.target.value })}><option value="hearts">หัวใจลอย</option><option value="sparkles">ประกาย</option><option value="emoji-rain">Emoji โปรย</option><option value="none">ไม่มี animation</option></select><input aria-label="Emoji" value={form.emoji} maxLength={4} onChange={(event) => setForm({ ...form, emoji: event.target.value })} /></div><div className="dialog-actions"><button type="button" onClick={() => setCompose(false)}>ยกเลิก</button><button className="primary"><Send size={14} /> ส่งถึง {recipientFor(profile)}</button></div></form> : <button className="primary compose-button" onClick={() => { setActive(null); setCompose(true); }}><Heart size={15} /> เขียนจดหมาย</button>}</section></div>}
  </>;
}
