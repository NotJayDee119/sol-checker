import { Check, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Multi-select ready-made comments. Tapping one adds it; tapping again removes it. */
export function CommentChips({
  label,
  options,
  selected,
  onChange,
  tone,
  disabled,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  tone: 'success' | 'warning';
  disabled?: boolean;
}) {
  function toggle(option: string) {
    // Keep the bank's order so the composed feedback reads the same every time.
    const next = selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option];
    onChange(options.filter((o) => next.includes(o)));
  }

  return (
    <View className="gap-2">
      <Text variant="footnote" className="ml-0.5 font-semibold">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <Pressable
              key={o}
              role="checkbox"
              accessibilityState={{ checked: on, disabled }}
              accessibilityLabel={o}
              disabled={disabled}
              onPress={() => toggle(o)}
              className={cn(
                'min-h-9 max-w-full flex-row items-center gap-1.5 rounded-2xl border px-3 py-1.5',
                on
                  ? tone === 'success'
                    ? 'border-success bg-success/10'
                    : 'border-warning bg-warning/10'
                  : 'border-border bg-card active:bg-muted',
                disabled && 'opacity-50'
              )}
            >
              <Icon
                as={on ? Check : Plus}
                size={14}
                className={on ? (tone === 'success' ? 'text-success' : 'text-warning') : 'text-muted-foreground'}
              />
              <Text variant="subhead" className={cn('shrink', on && 'font-semibold')}>
                {o}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
