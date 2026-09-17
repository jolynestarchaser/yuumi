import { useI18n, translate as t } from '../lib/i18n.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { ArrowDownAZ, Shapes } from 'lucide-react';
import DesktopItem from './DesktopItem.js';
import { useDesktopStore } from '../store/desktopStore.js';

export default function FolderDesktop({ folder }) {
  useI18n();
  const items = useDesktopStore((state) => state.items);
  const settings = useDesktopStore((state) => state.settings);
  const fetchFolderItems = useDesktopStore((state) => state.fetchFolderItems);
  const move = useDesktopStore((state) => state.moveItem);
  const previewMove = useDesktopStore((state) => state.previewMove);
  const open = useDesktopStore((state) => state.openWindow);
  const setContextMenu = useDesktopStore((state) => state.setContextMenu);
  const [selectedId, setSelectedId] = useState(null);
  const canvas = useRef(null);
  const mouse = useSensor(MouseSensor, { activationConstraint: { distance: 12 } });
  const touch = useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } });
  const sensors = useSensors(mouse, touch);
  const children = useMemo(() => items.filter((item) => String(item.parentId || '') === String(folder._id)), [items, folder._id]);
  const snap = (value) => settings.snapToGrid ? Math.round(value / 16) * 16 : value;

  useEffect(() => { fetchFolderItems(folder._id).catch(() => {}); }, [folder._id, fetchFolderItems]);

  function dragStart({ active }) {
    useDesktopStore.getState().socket?.emit('item:lock', { id: active.data.current.item?._id });
  }

  function dragMove({ active, delta }) {
    const item = active.data.current.item;
    if (item) previewMove(item._id, { x: snap(Math.max(0, item.position.x + delta.x)), y: snap(Math.max(0, item.position.y + delta.y)) });
  }

  function dragEnd({ active, over, delta }) {
    const item = active.data.current.item;
    if (!item) return;
    const targetId = String(over?.id || '').startsWith('folder:') ? String(over.id).slice(7) : null;
    if (targetId && targetId !== item._id) return move(item._id, targetId, { x: 28, y: 28 });
    const rect = canvas.current.getBoundingClientRect();
    const position = { x: snap(Math.max(0, Math.min(rect.width - 132, item.position.x + delta.x))), y: snap(Math.max(0, Math.min(rect.height - 118, item.position.y + delta.y))) };
    move(item._id, folder._id, position);
  }

  async function arrange(sortBy) {
    const rect = canvas.current.getBoundingClientRect();
    const columns = Math.max(1, Math.floor((rect.width - 24) / 132));
    const ordered = [...children].sort((a, b) => sortBy === 'type' ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    await Promise.all(ordered.map((item, index) => move(item._id, folder._id, { x: 18 + (index % columns) * 132, y: 18 + Math.floor(index / columns) * 124 })));
  }

  return <section className='folder-desktop'>
    <div className='folder-toolbar' data-no-drag><span>{children.length} {t("item")}{children.length === 1 ? '' : t("s")}</span><button onClick={() => arrange('name')}><ArrowDownAZ size={14} /> {t("Arrange by name")}</button><button onClick={() => arrange('type')}><Shapes size={14} /> {t("Arrange by type")}</button></div>
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={dragStart} onDragMove={dragMove} onDragEnd={dragEnd}>
      <div ref={canvas} className='folder-desktop-canvas' onClick={() => setSelectedId(null)} onContextMenu={(event) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, item: null, parentId: folder._id }); }}>
        {!children.length && <p className='folder-empty'>{t("Drop items here or create something new.")}</p>}
        {children.map((item) => <DesktopItem key={item._id} item={item} selected={selectedId === item._id} iconTheme={settings.iconTheme} onSelect={(value) => setSelectedId(value._id)} onOpen={open} onAudio={open} onContext={(event, value) => setContextMenu({ x: event.clientX, y: event.clientY, item: value, parentId: folder._id })} />)}
      </div>
    </DndContext>
  </section>;
}
