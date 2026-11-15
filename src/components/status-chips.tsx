import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

function Chip({ tone, label }: { tone: 'success' | 'warning' | 'muted'; label: string }) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1',
        tone === 'success' ? 'bg-success/10' : tone === 'warning' ? 'bg-warning/10' : 'bg-muted'
      )}
      accessible
      accessibilityLabel={label}
    >
      <View
        className={cn(
          'h-2 w-2 rounded-full',
          tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-muted-foreground'
        )}
      />
      <Text
        variant="caption"
        className={cn(
          'font-semibold',
          tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground'
        )}
      >
        {label}
      </Text>
    </View>
  );
}

/** Storage status (spec §3.1 step 1, §8 local mode). */
export function StatusChips() {
  const { storage } = useStore();
  return (
    <View className="flex-row flex-wrap gap-2">
      {storage === 'error' ? (
        <Chip tone="warning" label="Not saving — results kept until you close the app" />
      ) : (
        <Chip tone={storage === 'saved' ? 'success' : 'muted'} label="Saving on this device" />
      )}
    </View>
  );
}
