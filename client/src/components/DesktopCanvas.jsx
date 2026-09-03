import { useEffect, useMemo, useRef } from 'react';
import { DndContext, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import DesktopItem from './DesktopItem.jsx';
import InkLayer from './InkLayer.jsx';
import TrashBin from './TrashBin.jsx';
import { useDesktopStore } from '../store/desktopStore.js';

export default function DesktopCanvas({ settings, onUrlDrop, onFilesDrop, onAudio, trashCount, onTrashOpen }) {
  const items = useDesktopStore((state) => state.items);
  const selectedId = useDesktopStore((state) => state.selectedId);
  const select = useDesktopStore((state) => state.setSelected);
  const move = useDesktopStore((state) => state.moveItem);
  const trashItem = useDesktopStore((state) => state.trashItem);
  const previewMove = useDesktopStore((state) => state.previewMove);
  const openWindow = useDesktopStore((state) => state.openWindow);
  const context = useDesktopStore((state) => state.setContextMenu);
  const tool = useDesktopStore((state) => state.tool);
  const setTool = useDesktopStore((state) => state.setTool);
  const canvas = useRef(null);
  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const sensors = useSensors(pointerSensor);
  const rootItems = useMemo(() => items.filter((item) => !item.parentId), [items]);
  const snap = (value) => settings.snapToGrid ? Math.round(value / 16) * 16 : value;

  function dragStart({ active }) {
    const item = active.data.current.item;
    useDesktopStore.getState().socket?.emit('item:lock', { id: item?._id });
  }

  function dragMove({ active, delta }) {
    const item = active.data.current.item;
    if (item) previewMove(item._id, { x: snap(Math.max(0, item.position.x + delta.x)), y: snap(Math.max(0, item.position.y + delta.y)) });
  }

  async function drop({ active, over, delta }) {
    const item = active.data.current.item;
    if (!item) return;
    if (over?.id === 'trash') return trashItem(item._id);
    const folderId = String(over?.id || '').startsWith('folder:') ? String(over.id).slice(7) : null;
    if (folderId && folderId !== item._id) return move(item._id, folderId, { x: 32, y: 32 });
    const rect = canvas.current.getBoundingClientRect();
    const position = { x: snap(Math.max(0, Math.min(rect.width - 140, item.position.x + delta.x))), y: snap(Math.max(0, Math.min(rect.height - 132, item.position.y + delta.y))) };
    previewMove(item._id, position);
    move(item._id, item.parentId, position);
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

  return <DndContext sensors={tool === 'select' ? sensors : []} collisionDetection={pointerWithin} onDragStart={dragStart} onDragMove={dragMove} onDragEnd={drop}>
    <main ref={canvas} style={style} className={`desktop-canvas wallpaper-${wallpaper.value || 'neon'} wallpaper-${wallpaper.type || 'preset'}`} onDragOver={(event) => event.preventDefault()} onDrop={nativeDrop} onClick={() => { if (tool === 'select') { select(null); context(null); } }} onContextMenu={(event) => { if (tool !== 'select') return; event.preventDefault(); context({ x: event.clientX, y: event.clientY, item: null, parentId: null }); }}>
      <div className='wallpaper-orbit' />
      <InkLayer canvasRef={canvas} />
      <div className='desktop-label'>Yuu & Mi <span>one shared desktop</span></div>
      {rootItems.map((item) => <DesktopItem key={item._id} item={item} selected={selectedId === item._id} iconTheme={settings.iconTheme} onSelect={(value) => select(value._id)} onOpen={openWindow} onAudio={onAudio} onContext={(event, value) => context({ x: event.clientX, y: event.clientY, item: value, parentId: value.parentId })} />)}
    </main>
    <TrashBin count={trashCount} onOpen={onTrashOpen} />
  </DndContext>;
}
