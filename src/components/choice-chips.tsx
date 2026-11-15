import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Wrapping single-choice pill chips (radio group). */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text variant="footnote" className="ml-0.5 font-semibold">
          {label}
        </Text>
      ) : null}
      <View role="radiogroup" accessibilityLabel={label} className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              role="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(o.value)}
              className={cn(
                'min-h-9 justify-center rounded-full border px-3.5 py-1.5',
                selected ? 'border-info bg-accent' : 'border-border bg-card active:bg-muted'
              )}
            >
              <Text
                variant="subhead"
                className={cn(selected ? 'font-semibold text-accent-foreground' : 'text-foreground')}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
