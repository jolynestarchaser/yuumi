import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useDesktopStore } from '../store/desktopStore.js';

export default function FolderWindow() {
  const folder = useDesktopStore((s) => s.folder); const close = useDesktopStore((s) => s.setFolder); const preview = useDesktopStore((s) => s.setPreview); const [children, setChildren] = useState([]);
  useEffect(() => { if (folder) api.get('/items', { params: { parentId: folder._id } }).then(({ data }) => setChildren(data.data)); }, [folder]);
  if (!folder) return null;
  return <section className="folder-window" role="dialog" aria-label={`${folder.name} folder`}><header><div><span className="eyebrow">Folder</span><h2>{folder.name}</h2></div><button onClick={() => close(null)} aria-label="Close folder">×</button></header>{children.length ? <div className="folder-grid">{children.map((item) => <button key={item._id} className="folder-child" onDoubleClick={() => item.type === 'folder' ? close(item) : preview(item)}><span>{item.type === 'folder' ? '▱' : item.type === 'note' ? '✦' : item.type === 'link' ? '↗' : '◒'}</span>{item.name}</button>)}</div> : <p className="empty-folder">Nothing tucked away here yet.</p>}</section>;
}

