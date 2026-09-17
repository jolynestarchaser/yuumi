import { CheckCircle2, X } from 'lucide-react';
import { useDesktopStore } from '../store/desktopStore.js';

export default function ToastRegion() {
  const toasts = useDesktopStore((state) => state.toasts);
  const dismiss = useDesktopStore((state) => state.dismissToast);
  return <aside className='toast-region' aria-live='polite'>{toasts.map((toast) => <div className={`glass-toast ${toast.tone || ''}`} key={toast.id}><CheckCircle2 size={17} /><span>{toast.message}</span><button onClick={() => dismiss(toast.id)} aria-label='Dismiss'><X size={14} /></button></div>)}</aside>;
}
