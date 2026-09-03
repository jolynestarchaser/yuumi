import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function GlassDialog({ title, eyebrow, onClose, children, actions, className = '' }) {
  const titleId = useId();
  const surface = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement;
    const focusableSelector = "input, button, textarea, select, [tabindex]:not([tabindex='-1'])";
    const focusable = surface.current?.querySelector(focusableSelector);
    focusable?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab' || !surface.current) return;
      const nodes = [...surface.current.querySelectorAll(focusableSelector)].filter((node) => !node.disabled);
      if (!nodes.length) return;
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    globalThis.window.addEventListener('keydown', keydown);
    return () => { globalThis.window.removeEventListener('keydown', keydown); previous?.focus?.(); };
  }, []);

  return createPortal(
    <div className='modal-backdrop' onMouseDown={onClose}>
      <section ref={surface} className={`glass-dialog ${className}`} role='dialog' aria-modal='true' aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
        <header className='dialog-heading'>
          <div>{eyebrow && <p className='eyebrow'>{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div>
          <button type='button' className='close-dialog' onClick={onClose} aria-label='Close'><X size={16} /></button>
        </header>
        <div className='dialog-content'>{children}</div>
        {actions && <footer className='dialog-actions'>{actions}</footer>}
      </section>
    </div>,
    document.body
  );
}
