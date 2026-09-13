import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn('flex h-10 w-full rounded-xl border border-white/15 bg-black/15 px-3 py-2 text-sm text-ink shadow-inner outline-none placeholder:text-ink/45 focus:border-royal focus:ring-2 focus:ring-royal/30 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));

Input.displayName = 'Input';
