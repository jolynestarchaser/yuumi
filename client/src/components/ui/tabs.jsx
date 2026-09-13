import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...props }) => <TabsPrimitive.List className={cn('inline-flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-black/15 p-1', className)} {...props} />;
export const TabsTrigger = ({ className, ...props }) => <TabsPrimitive.Trigger className={cn('rounded-lg px-3 py-1.5 text-sm text-ink/65 transition data-[state=active]:bg-white/15 data-[state=active]:text-ink', className)} {...props} />;
export const TabsContent = ({ className, ...props }) => <TabsPrimitive.Content className={cn('mt-3 outline-none', className)} {...props} />;
