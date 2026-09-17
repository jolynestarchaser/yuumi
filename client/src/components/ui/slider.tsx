import type * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export const Slider = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>) => <SliderPrimitive.Root className={cn('relative flex w-full touch-none select-none items-center', className)} {...props}><SliderPrimitive.Track className='relative h-1.5 grow overflow-hidden rounded-full bg-white/15'><SliderPrimitive.Range className='absolute h-full bg-royal' /></SliderPrimitive.Track><SliderPrimitive.Thumb className='block size-4 rounded-full border-2 border-royal bg-ink shadow focus:outline-none focus:ring-2 focus:ring-royal/40' /></SliderPrimitive.Root>;
