import { useI18n, getLocale, translate as t } from '../lib/i18n.js';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { History, RotateCcw, X } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';
import ConfirmDialog from './ConfirmDialog.js';

export default function HistoryDialog({ entityType, entity, onClose }) {
  useI18n();
  const history = useDesktopStore((state) => state.history);
  const fetchHistory = useDesktopStore((state) => state.fetchHistory);
  const restore = useDesktopStore((state) => state.restoreHistory);
  const [pending, setPending] = useState(null);
  useEffect(() => { fetchHistory(entityType, entity._id).catch(() => {}); }, [entityType, entity._id, fetchHistory]);
  async function restoreVersion(version) {
    try { await restore(version._id, entityType === 'item' ? entity.contentRevision || 0 : entity.revision || 0); onClose(); } catch { /* toast is handled by the store caller */ }
  }
  return createPortal(<><div className="modal-backdrop" role="presentation"><section className="glass-dialog history-dialog" role="dialog" aria-modal="true" aria-label={t("Version history")}><div className="dialog-heading history-heading"><div><p className="eyebrow"><History size={13} /> {t("Version history")}</p><h2>{entity.name || t("Desktop text")}</h2></div><button type="button" className="close-dialog" aria-label={t("Close version history")} onClick={onClose}><X size={16} /></button></div><div className="history-list">{history.length ? history.map((version) => <article className="history-row" key={version._id}><div><strong>{t("v")}{version.revision} · {t(version.operation)}</strong><small>{version.actor} · {new Date(version.createdAt).toLocaleString(getLocale())}</small><p>{version.snapshot?.content || version.snapshot?.text || version.snapshot?.name || t("Updated desktop data")}</p></div><button type="button" title={t("Restore this version")} onClick={() => setPending(version)}><RotateCcw size={15} /></button></article>) : <p className="empty-folder">{t("ยังไม่มีประวัติ")}</p>}</div></section></div>{pending && <ConfirmDialog title={t("Restore this version?")} message={t("เวอร์ชันปัจจุบันจะยังอยู่ และการกู้คืนจะสร้างเวอร์ชันใหม่")} confirmLabel={t("Restore")} onClose={() => setPending(null)} onConfirm={async () => { await restoreVersion(pending); setPending(null); }} />}</>, document.body);
}
