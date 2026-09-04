import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AudioLines, File, FileImage, FileText, Folder, Link2, Music2, Play, Video } from 'lucide-react';
import { iconComponents } from '../lib/iconCatalog.jsx';

const defaultIcons = { folder: Folder, image: FileImage, video: Video, audio: AudioLines, link: Link2, note: FileText, file: File };

export default function DesktopItem({ item, selected, iconTheme, onSelect, onOpen, onContext, onAudio }) {
  const draggable = useDraggable({ id: item._id, data: { item } });
  const droppable = useDroppable({ id: `folder:${item._id}`, disabled: item.type !== 'folder' });
  const appearance = item.appearance || {};
  const spotify = item.type === 'link' && item.metadata?.provider === 'spotify';
  const customType = ['lucide', 'emoji', 'image'].includes(appearance.iconType);
  const naturalThumbnail = item.type === 'image' ? item.asset?.thumbnailUrl || item.asset?.secureUrl : item.type === 'link' ? item.metadata?.previewImage : null;
  const Icon = appearance.iconType === 'lucide' ? iconComponents[appearance.iconValue] || (spotify ? Music2 : defaultIcons[item.type]) || File : (spotify ? Music2 : defaultIcons[item.type]) || File;
  const visual = appearance.iconType === 'emoji'
    ? <span className='emoji-icon'>{appearance.iconValue}</span>
    : appearance.iconType === 'image'
      ? <img className='custom-item-icon' src={appearance.iconValue} alt='' />
      : !customType && naturalThumbnail
        ? <img src={naturalThumbnail} alt='' />
        : <Icon className='item-icon' strokeWidth={1.7} />;
  const style = {
    left: item.position.x,
    top: item.position.y,
    transform: draggable.transform ? `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)` : undefined,
    '--icon-tint': appearance.iconColor,
    '--icon-background': appearance.iconBackground
  };

  return <article ref={(node) => { draggable.setNodeRef(node); droppable.setNodeRef(node); }} style={style} className={`desktop-item icon-theme-${iconTheme} ${item.type} ${selected ? 'selected' : ''} ${droppable.isOver ? 'drop-target' : ''} ${draggable.isDragging ? 'dragging' : ''}`} {...draggable.listeners} {...draggable.attributes} onClick={(event) => { event.stopPropagation(); onSelect(item, event); }} onDoubleClick={() => onOpen(item)} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onContext(event, item); }}>
    <div className='item-visual'>
      {visual}
      {item.type === 'video' && <span className='play-badge'><Play size={15} fill='currentColor' /></span>}
      {spotify && <button data-no-drag className='spotify-card-play' onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpen(item); }} aria-label={`Open ${item.name} in Spotify`}><Play size={17} fill='currentColor' /></button>}
      {item.type === 'audio' && <button data-no-drag className='audio-card-play' onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onAudio(item); }} aria-label={`Play ${item.name}`}><Play size={15} fill='currentColor' /></button>}
    </div>
    <p>{item.name}</p>
  </article>;
}
