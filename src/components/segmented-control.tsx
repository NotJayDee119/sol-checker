import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** iOS-style segmented control. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <View role="radiogroup" className={cn('flex-row rounded-xl bg-muted p-0.5', className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            role="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            className={cn('flex-1 items-center rounded-[10px] py-2', selected && 'bg-card shadow-sm')}
          >
            <Text
              variant="footnote"
              className={cn('font-medium', selected ? 'text-foreground' : 'text-muted-foreground')}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
