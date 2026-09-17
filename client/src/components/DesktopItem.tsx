import { useI18n, translate as t } from '../lib/i18n.js';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { AudioLines, CalendarDays, File, FileImage, FileText, Folder, Globe2, Link2, LockKeyhole, Music2, Play, Video } from 'lucide-react';
import { useState } from 'react';
import { iconComponents } from '../lib/iconCatalog.js';

const defaultIcons = { folder: Folder, image: FileImage, video: Video, audio: AudioLines, link: Link2, note: FileText, file: File, calendar: CalendarDays, map: Globe2 };

export default function DesktopItem({ item, selected, iconTheme, onSelect, onOpen, onContext, onAudio }) {
  useI18n();
  const [revealed, setRevealed] = useState(false);
  const draggable = useDraggable({ id: item._id, data: { item } });
  const droppable = useDroppable({ id: `folder:${item._id}`, disabled: item.type !== 'folder' });
  const appearance = item.appearance || {};
  const spotify = item.type === 'link' && item.metadata?.provider === 'spotify';
  const sprite = item.type === 'image' && appearance.sprite?.enabled && appearance.sprite.frames > 1;
  const animatedGif = item.type === 'image' && item.asset?.mimeType === 'image/gif';
  const customType = ['lucide', 'emoji', 'image'].includes(appearance.iconType);
  const naturalThumbnail = item.type === 'image' ? animatedGif ? item.asset?.secureUrl : item.asset?.thumbnailUrl || item.asset?.secureUrl : item.type === 'link' ? item.metadata?.previewImage : null;
  const Icon = appearance.iconType === 'lucide' ? iconComponents[appearance.iconValue] || (spotify ? Music2 : defaultIcons[item.type]) || File : (spotify ? Music2 : defaultIcons[item.type]) || File;
  const visual = item.secret && !revealed ? <LockKeyhole className='item-icon secret-icon' strokeWidth={1.7} /> : sprite
    ? <span className='sprite-sheet' style={{ '--sprite-image': `url("${item.asset?.secureUrl}")`, '--sprite-frames': appearance.sprite.frames, '--sprite-duration': `${appearance.sprite.frames / appearance.sprite.fps}s` }} aria-label={t("{value0} animated sprite", { value0: item.name })} />
    : appearance.iconType === 'emoji'
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

  return <article ref={(node) => { draggable.setNodeRef(node); droppable.setNodeRef(node); }} style={style} className={`desktop-item icon-theme-${iconTheme} ${item.type} ${item.secret ? 'secret-item' : ''} ${animatedGif ? 'animated-sprite' : ''} ${sprite ? 'sprite-item' : ''} ${selected ? 'selected' : ''} ${droppable.isOver ? 'drop-target' : ''} ${draggable.isDragging ? 'dragging' : ''}`} {...draggable.listeners} {...draggable.attributes} onClick={(event) => { event.stopPropagation(); onSelect(item, event); }} onDoubleClick={() => { if (item.secret && !revealed) setRevealed(true); else onOpen(item); }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onContext(event, item); }}>
    <div className='item-visual'>
      {visual}
      {item.type === 'video' && <span className='play-badge'><Play size={15} fill='currentColor' /></span>}
      {spotify && <button data-no-drag className='spotify-card-play' onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpen(item); }} aria-label={t("Open {value0} in Spotify", { value0: item.name })}><Play size={17} fill='currentColor' /></button>}
      {item.type === 'audio' && <button data-no-drag className='audio-card-play' onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onAudio(item); }} aria-label={t("Play {value0}", { value0: item.name })}><Play size={15} fill='currentColor' /></button>}
    </div>
    <p>{item.secret && !revealed ? (item.secretLabel || t("Secret item")) : item.name}</p>
  </article>;
}
