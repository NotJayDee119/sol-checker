import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';

import { Text, TextClassContext } from './text';

type Props = ViewProps & { className?: string };

export function Card({ className, ...props }: Props) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn('rounded-lg border border-border bg-card', className)} {...props} />
    </TextClassContext.Provider>
  );
}

export function CardHeader({ className, ...props }: Props) {
  return <View className={cn('gap-1 px-4 pt-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text role="heading" variant="headline" className={className} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text variant="subhead" tone="muted" className={className} {...props} />;
}

export function CardContent({ className, ...props }: Props) {
  return <View className={cn('p-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: Props) {
  return <View className={cn('flex-row items-center px-4 pb-4', className)} {...props} />;
}
