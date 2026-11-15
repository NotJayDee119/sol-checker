import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { clamp } from '@/lib/scoring';
import { cn } from '@/lib/utils';

/** Up to this many points, every score is a button; above it, a − / number / + stepper. */
const MAX_BUTTONS = 10;

function tap() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
}

/**
 * Score for one rubric criterion. `value` is null until the teacher picks a score, so an
 * untouched criterion is never saved as 0 by accident.
 */
export function ScorePicker({
  label,
  max,
  value,
  onChange,
  disabled,
}: {
  label: string;
  max: number;
  value: number | null;
  onChange: (score: number) => void;
  disabled?: boolean;
}) {
  if (max <= MAX_BUTTONS) {
    return (
      <View role="radiogroup" accessibilityLabel={`${label}, out of ${max}`} className="flex-row flex-wrap gap-2">
        {Array.from({ length: max + 1 }, (_, n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              role="radio"
              accessibilityLabel={`${n} out of ${max}`}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              hitSlop={4}
              onPress={() => {
                tap();
                onChange(n);
              }}
              className={cn(
                'h-11 min-w-11 items-center justify-center rounded-full border px-2',
                selected ? 'border-info bg-info' : 'border-border bg-card active:bg-muted',
                disabled && 'opacity-50'
              )}
            >
              <Text className={cn('font-mono-bold text-[16px]', selected ? 'text-white' : 'text-foreground')}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return <ScoreStepper label={label} max={max} value={value} onChange={onChange} disabled={disabled} />;
}

function ScoreStepper({
  label,
  max,
  value,
  onChange,
  disabled,
}: {
  label: string;
  max: number;
  value: number | null;
  onChange: (score: number) => void;
  disabled?: boolean;
}) {
  const shown = value === null ? '' : String(value);
  const [text, setText] = useState(shown);
  // Follow outside changes (−/+, Full, reset after saving) while rendering.
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setText(shown);
  }

  const step = (delta: number) => {
    tap();
    onChange(clamp((value ?? (delta > 0 ? -1 : max + 1)) + delta, 0, max));
  };

  return (
    <View className="flex-row items-center gap-2">
      <StepButton icon={Minus} label={`Lower ${label}`} onPress={() => step(-1)} disabled={disabled || value === 0} />
      <Input
        className="h-11 w-20 text-center font-mono text-[17px]"
        value={text}
        placeholder="–"
        keyboardType="number-pad"
        maxLength={3}
        selectTextOnFocus
        editable={!disabled}
        accessibilityLabel={`${label} score, out of ${max}`}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, '');
          setText(digits);
          if (digits) onChange(clamp(Number(digits), 0, max));
        }}
        onBlur={() => setText(shown)}
      />
      <StepButton icon={Plus} label={`Raise ${label}`} onPress={() => step(1)} disabled={disabled || value === max} />
      <Text className="font-mono text-muted-foreground">/ {max}</Text>
      <Pressable
        role="button"
        accessibilityLabel={`Full points for ${label}`}
        disabled={disabled}
        onPress={() => {
          tap();
          onChange(max);
        }}
        className="ml-auto h-9 justify-center rounded-full border border-border bg-card px-3 active:bg-muted"
      >
        <Text variant="footnote" className="font-semibold text-info">
          Full
        </Text>
      </Pressable>
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: typeof Plus;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full border border-border bg-card active:bg-muted',
        disabled && 'opacity-40'
      )}
    >
      <Icon as={icon} size={18} className="text-foreground" />
    </Pressable>
  );
}
