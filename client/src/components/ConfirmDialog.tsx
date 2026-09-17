import { useI18n, translate as t } from '../lib/i18n.js';
import GlassDialog from './GlassDialog.js';
import { Button } from './ui/button.js';

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  useI18n();
  return <GlassDialog title={title} eyebrow={t("Please confirm")} onClose={onClose} actions={<><Button variant='secondary' onClick={onClose}>{t("Cancel")}</Button><Button variant='destructive' onClick={onConfirm}>{t(confirmLabel)}</Button></>}>
    <p className='dialog-copy'>{message}</p>
  </GlassDialog>;
}
