import { useEffect, useState } from 'react';
import { History, RotateCcw, X } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function HistoryDialog({ entityType, entity, onClose }) {
  const history = useDesktopStore((state) => state.history);
  const fetchHistory = useDesktopStore((state) => state.fetchHistory);
  const restore = useDesktopStore((state) => state.restoreHistory);
  const [pending, setPending] = useState(null);
  useEffect(() => { fetchHistory(entityType, entity._id).catch(() => {}); }, [entityType, entity._id, fetchHistory]);
  async function restoreVersion(version) {
    try { await restore(version._id, entityType === 'item' ? entity.contentRevision || 0 : entity.revision || 0); onClose(); } catch { /* toast is handled by the store caller */ }
  }
  return <><div className="modal-backdrop"><section className="glass-dialog history-dialog"><div className="dialog-heading"><div><p className="eyebrow"><History size={13} /> Version history</p><h2>{entity.name || 'Desktop text'}</h2></div><button className="close-dialog" onClick={onClose}><X size={16} /></button></div><div className="history-list">{history.length ? history.map((version) => <article className="history-row" key={version._id}><div><strong>v{version.revision} · {version.operation}</strong><small>{version.actor} · {new Date(version.createdAt).toLocaleString()}</small><p>{version.snapshot?.content || version.snapshot?.text || version.snapshot?.name || 'Updated desktop data'}</p></div><button title="Restore this version" onClick={() => setPending(version)}><RotateCcw size={15} /></button></article>) : <p className="empty-folder">ยังไม่มีประวัติ</p>}</div></section></div>{pending && <ConfirmDialog title="Restore this version?" message="เวอร์ชันปัจจุบันจะยังอยู่ และการกู้คืนจะสร้างเวอร์ชันใหม่" confirmLabel="Restore" onClose={() => setPending(null)} onConfirm={async () => { await restoreVersion(pending); setPending(null); }} />}</>;
}
