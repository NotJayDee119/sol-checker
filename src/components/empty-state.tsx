import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center gap-3 rounded-lg border border-border bg-card px-6 py-10">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Icon as={icon} className="text-primary" size={26} />
      </View>
      <Text variant="headline" className="text-center">
        {title}
      </Text>
      <Text variant="subhead" tone="muted" className="max-w-xs text-center">
        {description}
      </Text>
      {action ? <View className="mt-2">{action}</View> : null}
    </View>
  );
}
