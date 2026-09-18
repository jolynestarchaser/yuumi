import { useI18n, translate as t } from '../lib/i18n.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, History, Maximize2, Minimize2, Pause, Play, X } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import { useAuthStore } from '../store/authStore.js';
import FolderDesktop from './FolderDesktop.js';
import HistoryDialog from './HistoryDialog.js';
import RelationshipCalendar from './RelationshipCalendar.js';
import TravelMap from './TravelMap.js';
import { normalizeNoteDraft, noteCopyPayload, recoverNoteDraft, shouldAcceptContentRevision } from '../lib/itemReconciliation.js';

function NoteWindow({ item, onRegisterClose }) {
  useI18n();
  const update = useDesktopStore((state) => state.updateItem);
  const createItem = useDesktopStore((state) => state.createItem);
  const pushToast = useDesktopStore((state) => state.pushToast);
  const profile = useAuthStore((state) => state.profile || 'shared');
  const recoveryKey = `yuu-mi:note-draft:${profile}:${item._id}`;
  const restored = useMemo(() => {
    try { const saved = sessionStorage.getItem(recoveryKey); return saved ? JSON.parse(saved) : null; } catch { return null; }
  }, [recoveryKey]);
  const recoveredDraft = useMemo(() => recoverNoteDraft(item, restored), [item._id, restored]);
  const [name, setName] = useState(recoveredDraft.name);
  const [content, setContent] = useState(recoveredDraft.content);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(recoveredDraft.recovered ? 'dirty' : 'clean');
  const [conflict, setConflict] = useState<any>(null);
  const nameRef = useRef(recoveredDraft.name);
  const contentRef = useRef(recoveredDraft.content);
  const baseRef = useRef(recoveredDraft.base);
  const revisionRef = useRef(recoveredDraft.revision);
  const editSequenceRef = useRef(0);
  const savingRef = useRef(false);
  const inFlightRef = useRef<Promise<any> | null>(null);
  const inFlightSnapshotRef = useRef<{ name: string; content: string; revision: number; sequence: number } | null>(null);
  const conflictRef = useRef<any>(null);
  const queueSaveRef = useRef<() => void>(() => {});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setName(recoveredDraft.name);
    setContent(recoveredDraft.content);
    nameRef.current = recoveredDraft.name;
    contentRef.current = recoveredDraft.content;
    baseRef.current = recoveredDraft.base;
    revisionRef.current = recoveredDraft.revision;
    editSequenceRef.current = 0;
    setStatus(recoveredDraft.recovered ? 'dirty' : 'clean');
    setConflict(null);
    conflictRef.current = null;
  }, [item._id, recoveredDraft]);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const persistRecovery = () => {
    try { sessionStorage.setItem(recoveryKey, JSON.stringify({ name: nameRef.current, content: contentRef.current, revision: revisionRef.current, base: baseRef.current })); } catch { /* In-memory draft remains until this window closes. */ }
  };
  const clearRecovery = () => { try { sessionStorage.removeItem(recoveryKey); } catch { /* Nothing to clear. */ } };

  const save = useCallback(async ({ announce = false } = {}) => {
    if (savingRef.current && inFlightRef.current) return inFlightRef.current;
    const sequence = editSequenceRef.current;
    const snapshot = normalizeNoteDraft(nameRef.current, contentRef.current, t('Untitled note'));
    const base = baseRef.current;
    const patch = { ...(snapshot.name !== base.name ? { name: snapshot.name } : {}), ...(snapshot.content !== base.content ? { content: snapshot.content } : {}) };
    if (!Object.keys(patch).length) {
      if (sequence === editSequenceRef.current) { setStatus('clean'); clearRecovery(); }
      return item;
    }
    const requestRevision = revisionRef.current;
    savingRef.current = true;
    setSaving(true);
    setStatus('saving');
    inFlightSnapshotRef.current = { ...snapshot, revision: requestRevision, sequence };
    const request = update(item._id, patch, requestRevision);
    inFlightRef.current = request;
    try {
      const saved = await request;
      const acknowledgedRevision = saved.contentRevision || requestRevision + 1;
      if (!shouldAcceptContentRevision(revisionRef.current, acknowledgedRevision)) return saved;
      baseRef.current = snapshot;
      revisionRef.current = acknowledgedRevision;
      if (!conflictRef.current || acknowledgedRevision >= (conflictRef.current.contentRevision || conflictRef.current.revision || 0)) {
        conflictRef.current = null;
        setConflict(null);
      }
      if (sequence === editSequenceRef.current) {
        if (!nameRef.current.trim()) { nameRef.current = snapshot.name; setName(snapshot.name); }
        setStatus('clean');
        clearRecovery();
        if (announce) pushToast('Note saved.');
      } else {
        // The user kept typing after this request left. Keep that newer draft and
        // save it against the revision just acknowledged; never call it Saved.
        persistRecovery();
        setStatus('dirty');
        queueSaveRef.current();
      }
      return saved;
    } catch (error) {
      const current = error?.response?.data?.error?.data?.current;
      if (current && (current.contentRevision || current.revision || 0) > revisionRef.current) { conflictRef.current = current; setConflict(current); setStatus('conflict'); } else if (!current) setStatus('error');
      persistRecovery();
      pushToast(error.response?.data?.error?.message || 'Could not save this note.', 'error');
      throw error;
    } finally {
      savingRef.current = false;
      inFlightRef.current = null;
      inFlightSnapshotRef.current = null;
      setSaving(false);
    }
  }, [item, pushToast, update]);

  const queueSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void save().catch(() => {}); }, 600);
  }, [save]);

  useEffect(() => { queueSaveRef.current = queueSave; }, [queueSave]);

  const scheduleSave = () => {
    persistRecovery(); setStatus('dirty');
    editSequenceRef.current += 1;
    queueSave();
  };

  const flush = useCallback(async ({ announce = false } = {}) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    // A save can acknowledge an older snapshot while typing continues. Repeat
    // until the currently visible draft is based on its own acknowledgement.
    while (nameRef.current.trim() || contentRef.current) {
      const before = editSequenceRef.current;
      await save({ announce });
      const normalized = normalizeNoteDraft(nameRef.current, contentRef.current, t('Untitled note'));
      if (before === editSequenceRef.current && normalized.name === baseRef.current.name && normalized.content === baseRef.current.content) return;
    }
    await save({ announce });
  }, [save]);

  useEffect(() => {
    if ((item.contentRevision || 0) <= revisionRef.current) return;
    const remote = { name: item.name, content: item.content || '', revision: item.contentRevision || 0 };
    const pending = inFlightSnapshotRef.current;
    // Socket broadcasts are emitted after the server has committed. Recognize
    // our own in-flight write so it cannot be shown as a false two-person conflict.
    if (pending && remote.revision === pending.revision + 1 && remote.name === pending.name && remote.content === pending.content) {
      baseRef.current = { name: remote.name, content: remote.content };
      revisionRef.current = remote.revision;
      if (pending.sequence === editSequenceRef.current) { setStatus('clean'); clearRecovery(); }
      else { setStatus('dirty'); persistRecovery(); }
      return;
    }
    if (status === 'clean') { setName(remote.name); setContent(remote.content); nameRef.current = remote.name; contentRef.current = remote.content; baseRef.current = { name: remote.name, content: remote.content }; revisionRef.current = remote.revision; clearRecovery(); }
    else { conflictRef.current = remote; setConflict(remote); }
  }, [item.contentRevision, item.name, item.content, status]);

  useEffect(() => {
    onRegisterClose?.(flush);
    return () => onRegisterClose?.(null);
  }, [flush, onRegisterClose]);

  return <><section className='note-window'><div className='note-toolbar'><input data-no-drag value={name} maxLength={160} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => { setName(event.target.value); nameRef.current = event.target.value; scheduleSave(); }} placeholder={t("Note title")} /><button data-no-drag type='button' disabled={saving} onClick={() => { void flush({ announce: true }).catch(() => {}); }}>{saving ? t("Saving…") : t("Save")}</button><button data-no-drag type='button' onClick={() => setHistoryOpen(true)}><History size={14} /> {t("History")}</button></div><textarea data-no-drag value={content} maxLength={10000} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => { setContent(event.target.value); contentRef.current = event.target.value; scheduleSave(); }} placeholder={t("Write something...")} /><small role='status'>{conflict ? t('Conflict') : status === 'error' ? t('Retry') : saving ? t('Saving…') : status === 'dirty' ? t('Unsaved') : t('Saved')} · {content.length}/10000</small>{conflict && <div className='note-conflict'><button data-no-drag type='button' onClick={() => { setName(conflict.name); setContent(conflict.content || ''); nameRef.current = conflict.name; contentRef.current = conflict.content || ''; baseRef.current = { name: conflict.name, content: conflict.content || '' }; revisionRef.current = conflict.contentRevision || conflict.revision || 0; conflictRef.current = null; setConflict(null); setStatus('clean'); clearRecovery(); }}>{t('Reload remote')}</button><button data-no-drag type='button' disabled={saving} onClick={() => { const copy = normalizeNoteDraft(nameRef.current, contentRef.current, t('Untitled note')); setSaving(true); void createItem(noteCopyPayload(item, copy, t('Copy'))).then(() => { setName(conflict.name); setContent(conflict.content || ''); nameRef.current = conflict.name; contentRef.current = conflict.content || ''; baseRef.current = { name: conflict.name, content: conflict.content || '' }; revisionRef.current = conflict.contentRevision || conflict.revision || revisionRef.current; conflictRef.current = null; setConflict(null); setStatus('clean'); clearRecovery(); pushToast('Note copy created.'); }).catch(() => pushToast('Could not create a note copy.', 'error')).finally(() => setSaving(false)); }}>{t('Save copy')}</button></div>}</section>{historyOpen && <HistoryDialog entityType='item' entity={item} onClose={() => setHistoryOpen(false)} />}</>;
}

function WindowContent({ item, onRegisterClose }) {
  useI18n();
  if (item.type === 'note') return <NoteWindow item={item} onRegisterClose={onRegisterClose} />;
  if (item.type === 'calendar') return <RelationshipCalendar item={item} />;
  if (item.type === 'map') return <TravelMap item={item} />;
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
