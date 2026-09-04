import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, pointerWithin, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import DesktopItem from './DesktopItem.jsx';
import InkLayer from './InkLayer.jsx';
import TrashBin from './TrashBin.jsx';
import { useDesktopStore } from '../store/desktopStore.js';

export default function DesktopCanvas({ settings, onUrlDrop, onFilesDrop, onAudio, trashCount, onTrashOpen }) {
  const items = useDesktopStore((state) => state.items);
  const selectedId = useDesktopStore((state) => state.selectedId);
  const selectedIds = useDesktopStore((state) => state.selectedIds);
  const select = useDesktopStore((state) => state.setSelected);
  const setSelectedIds = useDesktopStore((state) => state.setSelectedIds);
  const toggleSelected = useDesktopStore((state) => state.toggleSelected);
  const move = useDesktopStore((state) => state.moveItem);
  const trashItem = useDesktopStore((state) => state.trashItem);
  const previewMove = useDesktopStore((state) => state.previewMove);
  const openWindow = useDesktopStore((state) => state.openWindow);
  const context = useDesktopStore((state) => state.setContextMenu);
  const tool = useDesktopStore((state) => state.tool);
  const setTool = useDesktopStore((state) => state.setTool);
  const canvas = useRef(null);
  const dragOrigins = useRef(new Map());
  const marqueeMoved = useRef(false);
  const [marquee, setMarquee] = useState(null);
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } });
  const sensors = useSensors(pointerSensor, touchSensor);
  const rootItems = useMemo(() => items.filter((item) => !item.parentId), [items]);
  const snap = (value) => settings.snapToGrid ? Math.round(value / 16) * 16 : value;

  function dragStart({ active }) {
    const item = active.data.current.item;
    const group = selectedIds.includes(item?._id) ? rootItems.filter((row) => selectedIds.includes(row._id)) : [item];
    if (!selectedIds.includes(item?._id)) select(item?._id);
    dragOrigins.current = new Map(group.filter(Boolean).map((row) => [row._id, { ...row.position }]));
    group.forEach((row) => useDesktopStore.getState().socket?.emit('item:lock', { id: row?._id }));
  }

  function dragMove({ active, delta }) {
    const item = active.data.current.item;
    if (!item) return;
    const group = [...dragOrigins.current.entries()];
    group.forEach(([id, position]) => previewMove(id, { x: snap(Math.max(0, position.x + delta.x)), y: snap(Math.max(0, position.y + delta.y)) }));
  }

  function overlapsTrash(active) {
    const trash = document.querySelector('.trash-bin');
    const dragged = active.rect.current.translated;
    if (!trash || !dragged) return false;
    const target = trash.getBoundingClientRect();
    return dragged.left < target.right && dragged.right > target.left && dragged.top < target.bottom && dragged.bottom > target.top;
  }

  async function drop({ active, over, delta }) {
    const item = active.data.current.item;
    if (!item) return;
    const group = rootItems.filter((row) => dragOrigins.current.has(row._id));
    if (over?.id === 'trash' || overlapsTrash(active)) return Promise.all(group.map((row) => trashItem(row._id)));
    const folderId = String(over?.id || '').startsWith('folder:') ? String(over.id).slice(7) : null;
    if (folderId && !group.some((row) => row._id === folderId)) return Promise.all(group.map((row, index) => move(row._id, folderId, { x: 32 + (index % 4) * 18, y: 32 + Math.floor(index / 4) * 18 })));
    const rect = canvas.current.getBoundingClientRect();
    return Promise.all(group.map((row) => {
      const origin = dragOrigins.current.get(row._id) || row.position;
      const position = { x: snap(Math.max(0, Math.min(rect.width - 140, origin.x + delta.x))), y: snap(Math.max(0, Math.min(rect.height - 132, origin.y + delta.y))) };
      previewMove(row._id, position);
      return move(row._id, row.parentId, position);
    }));
  }

  function pointInCanvas(event) {
    const rect = canvas.current?.getBoundingClientRect();
    return rect && { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startMarquee(event) {
    if (tool !== 'select' || event.target.closest('.desktop-item, .desktop-text')) return;
    const point = pointInCanvas(event);
    if (!point) return;
    marqueeMoved.current = false;
    setMarquee({ start: point, end: point });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function moveMarquee(event) {
    if (!marquee) return;
    const point = pointInCanvas(event);
    if (point) {
      if (Math.hypot(point.x - marquee.start.x, point.y - marquee.start.y) > 5) marqueeMoved.current = true;
      setMarquee((value) => ({ ...value, end: point }));
    }
  }

  function endMarquee() {
    if (!marquee) return;
    const left = Math.min(marquee.start.x, marquee.end.x); const right = Math.max(marquee.start.x, marquee.end.x);
    const top = Math.min(marquee.start.y, marquee.end.y); const bottom = Math.max(marquee.start.y, marquee.end.y);
    if (right - left > 5 || bottom - top > 5) setSelectedIds(rootItems.filter((item) => item.position.x < right && item.position.x + 132 > left && item.position.y < bottom && item.position.y + 118 > top).map((item) => item._id));
    else select(null);
    setMarquee(null);
  }

  function nativeDrop(event) {
    event.preventDefault();
    const rect = canvas.current.getBoundingClientRect();
    const position = { x: Math.max(20, event.clientX - rect.left - 55), y: Math.max(60, event.clientY - rect.top - 45) };
    if (event.dataTransfer.files.length) return onFilesDrop([...event.dataTransfer.files], position);
    const url = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain');
    if (/^https?:\/\//i.test(url.trim())) onUrlDrop(url.trim(), position);
  }

  useEffect(() => {
    const keydown = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      const item = rootItems.find((row) => row._id === selectedId);
      if (event.key === 'Escape') { setTool('select'); select(null); context(null); }
      if (tool === 'select' && item && event.key === 'Enter') openWindow(item);
      if (tool === 'select' && item && event.key === 'Delete') useDesktopStore.getState().trashItem(item._id);
    };
    globalThis.window.addEventListener('keydown', keydown);
    return () => globalThis.window.removeEventListener('keydown', keydown);
  }, [rootItems, selectedId, tool, setTool, select, context, openWindow]);

  const wallpaper = settings.wallpaper || {};
  const style = {
    '--custom-wallpaper': wallpaper.type === 'image' ? `url(${wallpaper.asset?.url})` : undefined,
    '--wallpaper-gradient': wallpaper.type === 'gradient' ? `linear-gradient(${wallpaper.angle || 135}deg, ${(wallpaper.colors || ['#b6ff00', '#2453ff']).join(', ')})` : undefined,
    '--wallpaper-solid': wallpaper.type === 'solid' ? wallpaper.colors?.[0] : undefined,
    '--wallpaper-dimness': `${wallpaper.dimness ?? 18}%`,
    '--wallpaper-fit': wallpaper.fit || 'cover',
    '--wallpaper-x': `${wallpaper.position?.x ?? 50}%`,
    '--wallpaper-y': `${wallpaper.position?.y ?? 50}%`,
    '--wallpaper-bg': wallpaper.backgroundColor || '#06113e',
    '--wallpaper-filter': `blur(${wallpaper.blur || 0}px) brightness(${wallpaper.brightness ?? 100}%) saturate(${wallpaper.saturation ?? 100}%)`
  };

  return <DndContext sensors={tool === 'select' ? sensors : []} collisionDetection={(args) => {
    const pointerHits = pointerWithin(args);
    return pointerHits.length ? pointerHits : rectIntersection(args);
  }} onDragStart={dragStart} onDragMove={dragMove} onDragEnd={drop}>
    <main ref={canvas} style={style} className={`desktop-canvas wallpaper-${wallpaper.value || 'neon'} wallpaper-${wallpaper.type || 'preset'}`} onDragOver={(event) => event.preventDefault()} onDrop={nativeDrop} onPointerDown={startMarquee} onPointerMove={moveMarquee} onPointerUp={endMarquee} onPointerCancel={endMarquee} onClick={() => { if (marqueeMoved.current) { marqueeMoved.current = false; return; } if (tool === 'select') { select(null); context(null); } }} onContextMenu={(event) => { if (tool !== 'select') return; event.preventDefault(); context({ x: event.clientX, y: event.clientY, item: null, parentId: null }); }}>
      <div className='wallpaper-orbit' />
      <InkLayer canvasRef={canvas} />
      <div className='desktop-label'>Yuu & Mi <span>one shared desktop</span></div>
      {marquee && <i className='desktop-marquee' style={{ left: Math.min(marquee.start.x, marquee.end.x), top: Math.min(marquee.start.y, marquee.end.y), width: Math.abs(marquee.end.x - marquee.start.x), height: Math.abs(marquee.end.y - marquee.start.y) }} />}
      {rootItems.map((item) => <DesktopItem key={item._id} item={item} selected={selectedIds.includes(item._id) || selectedId === item._id} iconTheme={settings.iconTheme} onSelect={(value, event) => { if (event.metaKey || event.ctrlKey) toggleSelected(value._id); else select(value._id); }} onOpen={openWindow} onAudio={onAudio} onContext={(event, value) => context({ x: event.clientX, y: event.clientY, item: value, parentId: value.parentId })} />)}
    </main>
    <TrashBin count={trashCount} onOpen={onTrashOpen} />
  </DndContext>;
}
