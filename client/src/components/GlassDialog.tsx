import { useI18n, translate as t } from '../lib/i18n.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import type { ReactNode } from 'react';

interface GlassDialogProps {
  title: ReactNode; eyebrow?: ReactNode; onClose?: () => void;
  children: ReactNode; actions?: ReactNode; className?: string;
}

export default function GlassDialog({ title, eyebrow, onClose, children, actions, className = '' }: GlassDialogProps) {
  useI18n();
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className={`glass-dialog ${className}`}>
        <DialogHeader className='dialog-heading'>
          <div>
            {eyebrow && <p className='eyebrow'>{eyebrow}</p>}
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className='sr-only'>{t("Desktop dialog")}</DialogDescription>
          </div>
        </DialogHeader>
        <div className='dialog-content'>{children}</div>
        {actions && <DialogFooter className='dialog-actions'>{actions}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
