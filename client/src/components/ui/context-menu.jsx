import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;
export const ContextMenuSubTrigger = ({ className, inset, children, ...props }) => <ContextMenuPrimitive.SubTrigger className={cn('flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/10 data-[state=open]:bg-white/10', inset && 'pl-8', className)} {...props}>{children}<ChevronRight className='ml-auto size-4' /></ContextMenuPrimitive.SubTrigger>;
export const ContextMenuSubContent = ({ className, ...props }) => <ContextMenuPrimitive.SubContent className={cn('z-[1100] min-w-32 overflow-hidden rounded-xl border border-white/15 bg-[#0b173d]/95 p-1 text-ink shadow-2xl backdrop-blur-xl', className)} {...props} />;
export const ContextMenuContent = ({ className, ...props }) => <ContextMenuPrimitive.Portal><ContextMenuPrimitive.Content className={cn('z-[1100] min-w-32 overflow-hidden rounded-xl border border-white/15 bg-[#0b173d]/95 p-1 text-ink shadow-2xl backdrop-blur-xl', className)} {...props} /></ContextMenuPrimitive.Portal>;
export const ContextMenuItem = ({ className, inset, ...props }) => <ContextMenuPrimitive.Item className={cn('relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none focus:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50', inset && 'pl-8', className)} {...props} />;
export const ContextMenuCheckboxItem = ({ className, children, checked, ...props }) => <ContextMenuPrimitive.CheckboxItem className={cn('relative flex cursor-default select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} checked={checked} {...props}><span className='absolute left-2 flex size-4 items-center justify-center'><ContextMenuPrimitive.ItemIndicator><Check className='size-4' /></ContextMenuPrimitive.ItemIndicator></span>{children}</ContextMenuPrimitive.CheckboxItem>;
export const ContextMenuRadioItem = ({ className, children, ...props }) => <ContextMenuPrimitive.RadioItem className={cn('relative flex cursor-default select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-white/10', className)} {...props}><span className='absolute left-2 flex size-4 items-center justify-center'><ContextMenuPrimitive.ItemIndicator><Circle className='size-2 fill-current' /></ContextMenuPrimitive.ItemIndicator></span>{children}</ContextMenuPrimitive.RadioItem>;
export const ContextMenuLabel = ({ className, inset, ...props }) => <ContextMenuPrimitive.Label className={cn('px-2 py-1.5 text-xs font-semibold text-ink/60', inset && 'pl-8', className)} {...props} />;
export const ContextMenuSeparator = ({ className, ...props }) => <ContextMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-white/10', className)} {...props} />;
export const ContextMenuShortcut = ({ className, ...props }) => <span className={cn('ml-auto text-[10px] tracking-widest text-ink/40', className)} {...props} />;
