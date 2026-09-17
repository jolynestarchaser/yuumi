import type * as React from 'react';
import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-royal/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-royal px-4 py-2 text-white shadow-lg shadow-royal/25 hover:bg-royal/85',
        neon: 'bg-neon px-4 py-2 text-navy shadow-lg shadow-neon/20 hover:bg-neon/85',
        secondary: 'border border-white/15 bg-white/10 px-4 py-2 text-ink backdrop-blur hover:bg-white/15',
        ghost: 'px-3 py-2 text-ink/80 hover:bg-white/10 hover:text-ink',
        destructive: 'bg-red-500 px-4 py-2 text-white shadow-lg shadow-red-500/20 hover:bg-red-500/85',
        link: 'text-royal underline-offset-4 hover:underline'
      },
      size: {
        default: 'min-h-10',
        sm: 'min-h-8 rounded-lg px-3 text-xs',
        lg: 'min-h-12 rounded-2xl px-6',
        icon: 'size-10 rounded-full p-0'
      }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

export const Button = forwardRef<React.ElementRef<'button'>, React.ComponentPropsWithoutRef<'button'> & import('class-variance-authority').VariantProps<typeof buttonVariants>>(({ className, variant, size, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));

Button.displayName = 'Button';
export { buttonVariants };
