import GlassDialog from './GlassDialog.jsx';
import { Button } from './ui/button.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  return <GlassDialog title={title} eyebrow='Please confirm' onClose={onClose} actions={<><Button variant='secondary' onClick={onClose}>Cancel</Button><Button variant='destructive' onClick={onConfirm}>{confirmLabel}</Button></>}>
    <p className='dialog-copy'>{message}</p>
  </GlassDialog>;
}
