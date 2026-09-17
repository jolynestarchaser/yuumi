import { useI18n, translate as t } from '../lib/i18n.js';
import { useEffect, useState } from 'react';
import { File, Folder, RotateCcw, Trash2 } from 'lucide-react';
import GlassDialog from './GlassDialog.js';
import ConfirmDialog from './ConfirmDialog.js';
import { useDesktopStore } from '../store/desktopStore.js';
import { Button } from './ui/button.js';

export default function TrashDialog({ onClose }) {
  useI18n();
  const items = useDesktopStore((state) => state.trashItems);
  const fetchTrash = useDesktopStore((state) => state.fetchTrash);
  const restore = useDesktopStore((state) => state.restoreItem);
  const remove = useDesktopStore((state) => state.deletePermanently);
  const empty = useDesktopStore((state) => state.emptyTrash);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { fetchTrash().catch(() => {}); }, [fetchTrash]);
  const iconFor = (item) => item.type === 'folder' ? <Folder /> : <File />;

  return <>
    <GlassDialog title={t("Trash")} eyebrow={t('Ready to restore: {count}', { count: items.length })} onClose={onClose} className='trash-dialog' actions={items.length ? <Button variant='destructive' onClick={() => setConfirm('empty')}><Trash2 size={15} />{t('Empty Trash')}</Button> : null}>
      {items.length === 0 ? <p className='dialog-copy'>{t("Trash is empty. Drag an item here or choose “Move to Trash” to keep the desktop tidy.")}</p> : <div className='trash-list'>
        {items.map((item) => <article key={item._id} className='trash-row'>
          <div className='trash-item-icon'>{iconFor(item)}</div><p><strong>{item.name}</strong><span>{item.type}</span></p>
          <button type='button' onClick={() => restore(item._id)} title={t("Restore {value0}", { value0: item.name })}><RotateCcw size={16} />{t("Restore")}</button>
          <button type='button' className='trash-remove' onClick={() => setConfirm(item)} title={t("Permanently delete {value0}", { value0: item.name })}><Trash2 size={16} /></button>
        </article>)}
      </div>}
    </GlassDialog>
    {confirm && <ConfirmDialog title={confirm === 'empty' ? t("Empty Trash?") : t("Delete permanently?")} message={confirm === 'empty' ? t("Every item in Trash will be permanently deleted. This cannot be undone.") : t("{value0} will be permanently deleted. This cannot be undone.", { value0: confirm.name })} confirmLabel={confirm === 'empty' ? t("Empty Trash") : t("Delete permanently")} onClose={() => setConfirm(null)} onConfirm={async () => { if (confirm === 'empty') await empty(); else await remove(confirm._id); setConfirm(null); }} />}
  </>;
}
