import { useState } from 'react';
import GlassDialog from './GlassDialog.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import IconPickerDialog from './IconPickerDialog.jsx';
import SpriteDialog from './SpriteDialog.jsx';
import { useDesktopStore } from '../store/desktopStore.js';

export default function ContextMenu({ onAddLink }) {
  const menu = useDesktopStore((state) => state.contextMenu);
  const clear = useDesktopStore((state) => state.setContextMenu);
  const create = useDesktopStore((state) => state.createItem);
  const update = useDesktopStore((state) => state.updateItem);
  const remove = useDesktopStore((state) => state.trashItem);
  const move = useDesktopStore((state) => state.moveItem);
  const open = useDesktopStore((state) => state.openWindow);
  const [action, setAction] = useState(null);
  const [name, setName] = useState('');
  const item = menu?.item;

  async function newFolder() {
    await create({ name: 'New Folder', type: 'folder', parentId: item?.type === 'folder' ? item._id : menu.parentId, position: { x: Math.max(0, menu.x - 50), y: Math.max(0, menu.y - 50) } });
    clear(null);
  }

  async function newNote() {
    const note = await create({ name: 'Untitled note', type: 'note', content: 'Start writing...', parentId: item?.type === 'folder' ? item._id : menu.parentId || null, position: { x: menu.x, y: menu.y } });
    open(note);
    clear(null);
  }

  function beginAction(type) {
    setAction({ type, item });
    setName(item?.name || '');
    clear(null);
  }

  return <>
    {menu && <menu className='context-menu' style={{ position: 'fixed', left: menu.x, top: menu.y }}>
      {item ? <>
        <button onClick={() => { open(item); clear(null); }}>Open</button>
        {item.type === 'folder' && <><button onClick={newFolder}>New folder inside</button><button onClick={newNote}>New note inside</button></>}
        <button onClick={() => beginAction('rename')}>Rename</button>
        <button onClick={() => beginAction('icon')}>Change icon / thumbnail</button>
        {item.type === 'image' && <button onClick={() => beginAction('sprite')}>Animate sprite sheet</button>}
        {item.parentId && <button onClick={() => { move(item._id, null, { x: 60, y: 60 }); clear(null); }}>Move to desktop</button>}
        <button className='danger' onClick={() => beginAction('delete')}>Move to Trash</button>
      </> : <>
        <button onClick={newFolder}>New folder</button>
        <button onClick={newNote}>New note</button>
        <button onClick={() => { onAddLink(); clear(null); }}>Add URL</button>
      </>}
    </menu>}
    {action?.type === 'rename' && <GlassDialog title='Rename item' eyebrow='Desktop item' onClose={() => setAction(null)}>
      <form className='dialog-form' onSubmit={async (event) => { event.preventDefault(); if (name.trim()) await update(action.item._id, { name: name.trim() }); setAction(null); }}>
        <label>Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
        <div className='dialog-actions'><button type='button' onClick={() => setAction(null)}>Cancel</button><button className='primary'>Save name</button></div>
      </form>
    </GlassDialog>}
    {action?.type === 'icon' && <IconPickerDialog item={action.item} onSave={(appearance) => update(action.item._id, { appearance })} onClose={() => setAction(null)} />}
    {action?.type === 'sprite' && <SpriteDialog item={action.item} onSave={(appearance) => update(action.item._id, { appearance })} onClose={() => setAction(null)} />}
    {action?.type === 'delete' && <ConfirmDialog title='Move item to Trash?' confirmLabel='Move to Trash' message={`${action.item.name} can be restored from Trash later.`} onClose={() => setAction(null)} onConfirm={async () => { await remove(action.item._id); setAction(null); }} />}
  </>;
}
