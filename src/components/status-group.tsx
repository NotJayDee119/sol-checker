import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'muted';

/** Storage status (spec §3.1 step 1, §8 local mode) as a quiet list row. Place inside an InsetGroup. */
export function StatusRows() {
  const { storage } = useStore();
  const saving =
    storage === 'error'
      ? { tone: 'warning' as const, value: 'Not saving' }
      : storage === 'saved'
        ? { tone: 'success' as const, value: 'On this device' }
        : { tone: 'muted' as const, value: 'Starting…' };

  return <StatusRow label="Saving" {...saving} />;
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <View
      className="min-h-[52px] flex-row items-center gap-3 px-4"
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text className="flex-1 text-[17px]">{label}</Text>
      <View
        className={cn(
          'h-2 w-2 rounded-full',
          tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-muted-foreground'
        )}
      />
      <Text className="text-[17px] text-muted-foreground">{value}</Text>
    </View>
  );
}
