import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Maximize2, Minimize2, Pause, Play, X } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import FolderDesktop from './FolderDesktop.jsx';

function WindowContent({ item }) {
  const update = useDesktopStore((s) => s.updateItem);
  const [nameDraft, setNameDraft] = useState(item.name);
  const [draft, setDraft] = useState(item.content || '');
  const timers = useRef({ name: null, content: null });
  const composing = useRef(false);
  useEffect(() => {
    setNameDraft(item.name);
    setDraft(item.content || '');
  }, [item._id]);
  useEffect(() => () => { clearTimeout(timers.current.name); clearTimeout(timers.current.content); }, []);
  function saveName(value) {
    clearTimeout(timers.current.name);
    const name = value.trim();
    if (name && name !== item.name) update(item._id, { name });
  }
  function queueName(value) {
    if (composing.current) return;
    clearTimeout(timers.current.name);
    timers.current.name = setTimeout(() => saveName(value), 650);
  }
  function queueContent(value) {
    clearTimeout(timers.current.content);
    timers.current.content = setTimeout(() => update(item._id, { content: value }), 650);
  }
  if (item.type === 'image') return <img className='window-media' src={item.asset?.secureUrl} alt={item.name} />;
  if (item.type === 'video') return <video className='window-media' src={item.asset?.secureUrl} poster={item.asset?.thumbnailUrl} controls data-no-drag />;
  if (item.type === 'audio') return <section className='audio-window'><div className='album-disc'><Play fill='currentColor' /></div><h2>{item.name}</h2><audio src={item.asset?.secureUrl} controls data-no-drag /></section>;
  if (item.type === 'link' && item.metadata?.provider === 'youtube') return <section className='youtube-window'><iframe data-no-drag src={item.metadata.embedUrl} title={item.name} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowFullScreen /><a data-no-drag href={item.url} target='_blank' rel='noreferrer'>Open on YouTube</a></section>;
  if (item.type === 'link' && item.metadata?.provider === 'spotify') return <section className='spotify-mini-player'><iframe data-no-drag src={item.metadata.embedUrl} title={item.name} allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' loading='lazy' /><a data-no-drag href={item.url} target='_blank' rel='noreferrer'>Open in Spotify</a></section>;
  if (item.type === 'link') return <section className='link-preview'><img src={item.metadata?.previewImage} alt='' /><p>{item.metadata?.siteName}</p><h2>{item.metadata?.title || item.name}</h2><p>{item.metadata?.description}</p><a data-no-drag href={item.url} target='_blank' rel='noreferrer'>Open website</a></section>;
  if (item.type === 'file') return <section className='file-window'><Download size={42} /><h2>{item.name}</h2><p>{item.asset?.mimeType || 'File'} · {Math.ceil((item.asset?.bytes || 0) / 1024)} KB</p><a data-no-drag href={item.asset?.secureUrl} target='_blank' rel='noreferrer' download>Download file</a></section>;
  if (item.type === 'note') return <section className='note-window'><input data-no-drag value={nameDraft} onPointerDown={(event) => event.stopPropagation()} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={(event) => { composing.current = false; queueName(event.currentTarget.value); }} onChange={(event) => { const value = event.target.value; setNameDraft(value); queueName(value); }} onBlur={() => { if (nameDraft.trim()) saveName(nameDraft); else setNameDraft(item.name); }} placeholder='Note title' /><textarea data-no-drag value={draft} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => { const value = event.target.value; setDraft(value); queueContent(value); }} onBlur={() => { clearTimeout(timers.current.content); update(item._id, { content: draft }); }} placeholder='Write something...' /><small>Autosaves after you pause</small></section>;
  return <FolderContent item={item} />;
}

function FolderContent({ item }) {
  return <FolderDesktop folder={item} />;
}

function LegacyFolderContent({ item }) {
  const open = useDesktopStore((s) => s.openWindow);
  const items = useDesktopStore((s) => s.items);
  const fetchFolderItems = useDesktopStore((s) => s.fetchFolderItems);
  const children = items.filter((child) => String(child.parentId || '') === String(item._id));
  useEffect(() => { fetchFolderItems(item._id).catch(() => {}); }, [item._id, fetchFolderItems]);
  return <section className='folder-window-content'>{children.length ? children.map((child) => <button key={child._id} onDoubleClick={() => open(child)}><span>{child.appearance?.iconValue || '◈'}</span>{child.name}</button>) : <p>This folder is empty.</p>}</section>;
}

function DesktopWindow({ window, item }) {
  const update = useDesktopStore((s) => s.updateWindow); const preview = useDesktopStore((s) => s.previewWindow); const close = useDesktopStore((s) => s.closeWindow); const [bounds, setBounds] = useState(window.bounds); const drag = useRef();
  useEffect(() => setBounds(window.bounds), [window.bounds]);
  function start(event, resize = false) { if (event.target.closest('[data-no-drag]')) return; event.preventDefault(); const startBounds = bounds; drag.current = { x: event.clientX, y: event.clientY, startBounds, resize, active: false }; const move = (pointer) => { const dx = pointer.clientX - drag.current.x; const dy = pointer.clientY - drag.current.y; if (!drag.current.active && Math.hypot(dx, dy) < 10) return; drag.current.active = true; const next = resize ? { ...startBounds, width: Math.max(300, startBounds.width + dx), height: Math.max(220, startBounds.height + dy) } : { ...startBounds, x: Math.max(0, startBounds.x + dx), y: Math.max(0, startBounds.y + dy) }; setBounds(next); preview(window.itemId, next); }; const end = (pointer) => { const next = drag.current; drag.current = null; if (next?.active) update(window, { bounds: resize ? { ...startBounds, width: Math.max(300, startBounds.width + (pointer.clientX - next.x)), height: Math.max(220, startBounds.height + (pointer.clientY - next.y)) } : { ...startBounds, x: Math.max(0, startBounds.x + (pointer.clientX - next.x)), y: Math.max(0, startBounds.y + (pointer.clientY - next.y)) }, z: window.z + 1 }); globalThis.window.removeEventListener('pointermove', move); }; globalThis.window.addEventListener('pointermove', move); globalThis.window.addEventListener('pointerup', end, { once: true }); }
  const style = window.maximized ? {} : { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height, zIndex: window.z };
  return <section className={`desktop-window ${window.maximized ? 'maximized' : ''}`} style={style} onPointerDown={() => update(window, { z: window.z + 1 })}><header onPointerDown={start}><div className='traffic-lights'><button data-no-drag onClick={() => close(window.itemId)}><X size={11} /></button><button data-no-drag onClick={() => update(window, { minimized: true })}><Minimize2 size={11} /></button><button data-no-drag onClick={() => update(window, { maximized: !window.maximized, restoreBounds: window.maximized ? undefined : bounds })}><Maximize2 size={11} /></button></div><span>{item.name}</span></header><div className='window-body'>{<WindowContent item={item} />}</div><i className='resize-handle' onPointerDown={(event) => start(event, true)} /></section>;
}

export default function WindowManager() {
  const windows = useDesktopStore((s) => s.windows); const items = useDesktopStore((s) => s.items); const visible = useMemo(() => windows.filter((window) => !window.minimized).map((window) => ({ window, item: items.find((item) => item._id === window.itemId) })).filter((row) => row.item), [windows, items]);
  return <>{visible.map(({ window, item }) => <DesktopWindow key={window.itemId} window={window} item={item} />)}</>;
}
