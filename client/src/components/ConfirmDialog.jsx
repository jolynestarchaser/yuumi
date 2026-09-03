import GlassDialog from './GlassDialog.jsx';

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  return <GlassDialog title={title} eyebrow='Please confirm' onClose={onClose} actions={<><button type='button' onClick={onClose}>Cancel</button><button type='button' className='danger-button' onClick={onConfirm}>{confirmLabel}</button></>}>
    <p className='dialog-copy'>{message}</p>
  </GlassDialog>;
}
