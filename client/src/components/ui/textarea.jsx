import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('flex min-h-24 w-full resize-y rounded-xl border border-white/15 bg-black/15 px-3 py-2 text-sm text-ink shadow-inner outline-none placeholder:text-ink/45 focus:border-royal focus:ring-2 focus:ring-royal/30 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));

Textarea.displayName = 'Textarea';
