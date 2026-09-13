import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = ({ className, sideOffset = 6, ...props }) => (
  <TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={sideOffset} className={cn('z-[1100] rounded-lg border border-white/15 bg-[#0b173d]/95 px-3 py-1.5 text-xs text-ink shadow-xl backdrop-blur-xl', className)} {...props} /></TooltipPrimitive.Portal>
);
