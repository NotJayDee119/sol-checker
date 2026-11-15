import { View } from 'react-native';

import { cn } from '@/lib/utils';

export function Separator({ className, inset = false }: { className?: string; inset?: boolean }) {
  return <View role="separator" className={cn('h-px bg-border', inset && 'ml-4', className)} />;
}
