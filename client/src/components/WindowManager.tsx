import { useI18n, translate as t } from '../lib/i18n.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, History, Maximize2, Minimize2, Pause, Play, X } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import FolderDesktop from './FolderDesktop.js';
import HistoryDialog from './HistoryDialog.js';
import RelationshipCalendar from './RelationshipCalendar.js';

function NoteWindow({ item, onRegisterClose }) {
  useI18n();
  const update = useDesktopStore((state) => state.updateItem);
  const pushToast = useDesktopStore((state) => state.pushToast);
  const [name, setName] = useState(item.name);
  const [content, setContent] = useState(item.content || '');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(item.name);
  const contentRef = useRef(item.content || '');

  useEffect(() => {
    setName(item.name);
    setContent(item.content || '');
    nameRef.current = item.name;
    contentRef.current = item.content || '';
  }, [item._id]);

  const save = useCallback(async ({ announce = false } = {}) => {
    const nextName = nameRef.current.trim();
    const nextContent = contentRef.current;
    const patch = { ...(nextName && nextName !== item.name ? { name: nextName } : {}), ...(nextContent !== (item.content || '') ? { content: nextContent } : {}) };
    if (!Object.keys(patch).length) return item;
    setSaving(true);
    try {
      const saved = await update(item._id, patch);
      if (announce) pushToast('Note saved.');
      return saved;
    } catch (error) {
      pushToast(error.response?.data?.error?.message || 'Could not save this note.', 'error');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [item, pushToast, update]);

  useEffect(() => {
    onRegisterClose?.(save);
    return () => onRegisterClose?.(null);
  }, [onRegisterClose, save]);

  return <><section className='note-window'><div className='note-toolbar'><input data-no-drag value={name} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => { setName(event.target.value); nameRef.current = event.target.value; }} onBlur={() => { if (!nameRef.current.trim()) { setName(item.name); nameRef.current = item.name; } }} placeholder={t("Note title")} /><button data-no-drag type='button' disabled={saving} onClick={() => { void save({ announce: true }).catch(() => {}); }}>{saving ? t("Saving…") : t("Save")}</button><button data-no-drag type='button' onClick={() => setHistoryOpen(true)}><History size={14} /> {t("History")}</button></div><textarea data-no-drag value={content} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => { setContent(event.target.value); contentRef.current = event.target.value; }} placeholder={t("Write something...")} /><small>{t("Save anytime, or close the window to save · revision")} {item.contentRevision || 0}</small></section>{historyOpen && <HistoryDialog entityType='item' entity={item} onClose={() => setHistoryOpen(false)} />}</>;
}

function WindowContent({ item, onRegisterClose }) {
  useI18n();
  if (item.type === 'note') return <NoteWindow item={item} onRegisterClose={onRegisterClose} />;
  if (item.type === 'calendar') return <RelationshipCalendar item={item} />;
  if (item.type === 'image') return <img className='window-media' src={item.asset?.secureUrl} alt={item.name} />;
  if (item.type === 'video') return <video className='window-media' src={item.asset?.secureUrl} poster={item.asset?.thumbnailUrl} controls data-no-drag />;
  if (item.type === 'audio') return <section className='audio-window'><div className='album-disc'><Play fill='currentColor' /></div><h2>{item.name}</h2><audio src={item.asset?.secureUrl} controls data-no-drag /></section>;
  if (item.type === 'link' && item.metadata?.provider === 'youtube') return <section className='youtube-window'><iframe data-no-drag src={item.metadata.embedUrl} title={item.name} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowFullScreen /><a data-no-drag href={item.url} target='_blank' rel='noreferrer'>{t("Open on YouTube")}</a></section>;
  if (item.type === 'link' && item.metadata?.provider === 'spotify') return <section className='spotify-mini-player'><iframe data-no-drag src={item.metadata.embedUrl} title={item.name} allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' loading='lazy' /><a data-no-drag href={item.url} target='_blank' rel='noreferrer'>{t("Open in Spotify")}</a></section>;
  if (item.type === 'link') return <section className='link-preview'><img src={item.metadata?.previewImage} alt='' /><p>{item.metadata?.siteName}</p><h2>{item.metadata?.title || item.name}</h2><p>{item.metadata?.description}</p><a data-no-drag href={item.url} target='_blank' rel='noreferrer'>{t("Open website")}</a></section>;
  if (item.type === 'file') return <section className='file-window'><Download size={42} /><h2>{item.name}</h2><p>{item.asset?.mimeType || t("File")} · {Math.ceil((item.asset?.bytes || 0) / 1024)} {t("KB")}</p><a data-no-drag href={item.asset?.secureUrl} target='_blank' rel='noreferrer' download>{t("Download file")}</a></section>;
  return <FolderContent item={item} />;
}

function FolderContent({ item }) {
  useI18n();
  return <FolderDesktop folder={item} />;
}

function DesktopWindow({ window, item }) {
  useI18n();
  const update = useDesktopStore((s) => s.updateWindow); const preview = useDesktopStore((s) => s.previewWindow); const close = useDesktopStore((s) => s.closeWindow); const [bounds, setBounds] = useState(window.bounds); const drag = useRef<{ x: number; y: number; startBounds: import("../../../shared/contracts.js").Bounds; resize: boolean; active: boolean } | null>(null);
  const saveBeforeClose = useRef(null);
  useEffect(() => setBounds(window.bounds), [window.bounds]);
  function start(event, resize = false) { if (event.target.closest('[data-no-drag]')) return; event.preventDefault(); const startBounds = bounds; drag.current = { x: event.clientX, y: event.clientY, startBounds, resize, active: false }; const move = (pointer) => { const dx = pointer.clientX - drag.current.x; const dy = pointer.clientY - drag.current.y; if (!drag.current.active && Math.hypot(dx, dy) < 10) return; drag.current.active = true; const next = resize ? { ...startBounds, width: Math.max(300, startBounds.width + dx), height: Math.max(220, startBounds.height + dy) } : { ...startBounds, x: Math.max(0, startBounds.x + dx), y: Math.max(0, startBounds.y + dy) }; setBounds(next); preview(window.itemId, next); }; const end = (pointer) => { const next = drag.current; drag.current = null; if (next?.active) update(window, { bounds: resize ? { ...startBounds, width: Math.max(300, startBounds.width + (pointer.clientX - next.x)), height: Math.max(220, startBounds.height + (pointer.clientY - next.y)) } : { ...startBounds, x: Math.max(0, startBounds.x + (pointer.clientX - next.x)), y: Math.max(0, startBounds.y + (pointer.clientY - next.y)) }, z: window.z + 1 }); globalThis.window.removeEventListener('pointermove', move); }; globalThis.window.addEventListener('pointermove', move); globalThis.window.addEventListener('pointerup', end, { once: true }); }
  // Keep the persisted stacking order while maximized. The maximized class owns
  // the bounds, but the window must never lose its z-index and drop behind the desktop.
  const style = window.maximized
    ? { zIndex: window.z }
    : { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height, zIndex: window.z };
  async function closeWithSave() {
    try {
      await saveBeforeClose.current?.();
      close(window.itemId);
    } catch {
      // Keep the editor open so the user can retry after a failed save.
    }
  }
  return <section className={`desktop-window ${window.maximized ? 'maximized' : ''}`} style={style} onPointerDown={() => update(window, { z: window.z + 1 })}><header onPointerDown={start}><div className='traffic-lights'><button data-no-drag onClick={() => { void closeWithSave(); }}><X size={11} /></button><button data-no-drag onClick={() => update(window, { minimized: true })}><Minimize2 size={11} /></button><button data-no-drag onClick={() => update(window, { maximized: !window.maximized, restoreBounds: window.maximized ? undefined : bounds })}><Maximize2 size={11} /></button></div><span>{item.name}</span></header><div className='window-body'>{<WindowContent item={item} onRegisterClose={(save) => { saveBeforeClose.current = save; }} />}</div><i className='resize-handle' onPointerDown={(event) => start(event, true)} /></section>;
}

export default function WindowManager() {
  useI18n();
  const windows = useDesktopStore((s) => s.windows); const items = useDesktopStore((s) => s.items); const visible = useMemo(() => windows.filter((window) => !window.minimized).map((window) => ({ window, item: items.find((item) => item._id === window.itemId) })).filter((row) => row.item), [windows, items]);
  return <>{visible.map(({ window, item }) => <DesktopWindow key={window.itemId} window={window} item={item} />)}</>;
}
