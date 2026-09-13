import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export const Switch = ({ className, ...props }) => <SwitchPrimitive.Root className={cn('peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-white/20 transition data-[state=checked]:bg-royal focus:outline-none focus:ring-2 focus:ring-royal/40 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}><SwitchPrimitive.Thumb className='pointer-events-none block size-5 rounded-full bg-ink shadow-lg transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0' /></SwitchPrimitive.Root>;
