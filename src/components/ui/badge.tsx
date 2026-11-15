import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

import { cn } from '@/lib/utils';

import { TextClassContext } from './text';

const badgeVariants = cva('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', {
  variants: {
    variant: {
      default: 'bg-primary/10',
      muted: 'bg-muted',
      info: 'bg-accent',
      success: 'bg-success/10',
      warning: 'bg-warning/15',
      destructive: 'bg-destructive/10',
    },
  },
  defaultVariants: { variant: 'default' },
});

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-primary',
      muted: 'text-muted-foreground',
      info: 'text-accent-foreground',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Badge({
  className,
  variant,
  children,
}: VariantProps<typeof badgeVariants> & { className?: string; children: React.ReactNode }) {
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View className={cn(badgeVariants({ variant }), className)}>{children}</View>
    </TextClassContext.Provider>
  );
}
