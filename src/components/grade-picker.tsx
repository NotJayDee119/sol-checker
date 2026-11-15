import * as Haptics from 'expo-haptics';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SMOOTH } from '@/lib/ui-tokens';
import { cn } from '@/lib/utils';

/** K–12 grouped the way DepEd groups them. */
const LEVELS = [
  { title: 'Elementary', grades: ['K', '1', '2', '3', '4', '5', '6'] },
  { title: 'Junior High', grades: ['7', '8', '9', '10'] },
  { title: 'Senior High', grades: ['11', '12'] },
] as const;

const ORDER: string[] = LEVELS.flatMap((l) => [...l.grades]);

const nameOf = (g: string) => (g === 'K' ? 'Kinder' : `Grade ${g}`);

/** ['8', '7'] → "Grade 7, Grade 8" (always in school order). */
export function formatGrades(selected: string[]) {
  return ORDER.filter((g) => selected.includes(g))
    .map(nameOf)
    .join(', ');
}

/** Multi-select grid of grade tiles. */
export function GradePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  function toggle(g: string) {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  }

  return (
    <View className="gap-4">
      {LEVELS.map((level) => (
        <View key={level.title} className="gap-2">
          <Text variant="footnote" tone="muted">
            {level.title}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {level.grades.map((g) => {
              const on = value.includes(g);
              return (
                <Pressable
                  key={g}
                  role="checkbox"
                  aria-checked={on}
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={nameOf(g)}
                  onPress={() => toggle(g)}
                  hitSlop={2}
                  className={cn(
                    'h-11 w-11 items-center justify-center border',
                    on ? 'border-info bg-info' : 'border-border bg-card active:bg-muted'
                  )}
                  style={[SMOOTH, { borderRadius: 12 }]}
                >
                  <Text
                    className={cn('text-[16px] font-semibold', on ? 'text-white' : 'text-foreground')}
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {g}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
