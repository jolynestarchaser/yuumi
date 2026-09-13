import { useEffect, useState } from 'react';
import { File, Folder, RotateCcw, Trash2 } from 'lucide-react';
import GlassDialog from './GlassDialog.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { useDesktopStore } from '../store/desktopStore.js';
import { Button } from './ui/button.jsx';

export default function TrashDialog({ onClose }) {
  const items = useDesktopStore((state) => state.trashItems);
  const fetchTrash = useDesktopStore((state) => state.fetchTrash);
  const restore = useDesktopStore((state) => state.restoreItem);
  const remove = useDesktopStore((state) => state.deletePermanently);
  const empty = useDesktopStore((state) => state.emptyTrash);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchTrash().catch(() => {}); }, [fetchTrash]);
  const iconFor = (item) => item.type === 'folder' ? <Folder /> : <File />;

  return <>
    <GlassDialog title='Trash' eyebrow={`${items.length} item${items.length === 1 ? '' : 's'} ready to restore`} onClose={onClose} className='trash-dialog' actions={items.length ? <Button variant='destructive' onClick={() => setConfirm('empty')}><Trash2 size={15} />Empty Trash</Button> : null}>
      {items.length === 0 ? <p className='dialog-copy'>Trash is empty. Drag an item here or choose “Move to Trash” to keep the desktop tidy.</p> : <div className='trash-list'>
        {items.map((item) => <article key={item._id} className='trash-row'>
          <div className='trash-item-icon'>{iconFor(item)}</div><p><strong>{item.name}</strong><span>{item.type}</span></p>
          <button type='button' onClick={() => restore(item._id)} title={`Restore ${item.name}`}><RotateCcw size={16} />Restore</button>
          <button type='button' className='trash-remove' onClick={() => setConfirm(item)} title={`Permanently delete ${item.name}`}><Trash2 size={16} /></button>
        </article>)}
      </div>}
    </GlassDialog>
    {confirm && <ConfirmDialog title={confirm === 'empty' ? 'Empty Trash?' : 'Delete permanently?'} message={confirm === 'empty' ? 'Every item in Trash will be permanently deleted. This cannot be undone.' : `${confirm.name} will be permanently deleted. This cannot be undone.`} confirmLabel={confirm === 'empty' ? 'Empty Trash' : 'Delete permanently'} onClose={() => setConfirm(null)} onConfirm={async () => { if (confirm === 'empty') await empty(); else await remove(confirm._id); setConfirm(null); }} />}
  </>;
}
