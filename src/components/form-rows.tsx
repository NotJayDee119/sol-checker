import { Check } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';

/**
 * Form rows for iOS "inset grouped" forms. Place inside an InsetGroup, separated by InsetDividers.
 */

type InputProps = Omit<ComponentProps<typeof TextInput>, 'style'> & { mono?: boolean };

/** Small label above a borderless input (like editing a contact). */
export function StackedField({
  label,
  optional,
  invalid,
  multiline,
  mono,
  minHeight,
  ...props
}: InputProps & { label: string; optional?: boolean; invalid?: boolean; minHeight?: number }) {
  return (
    <View className="px-4 pb-2.5 pt-3">
      <Text
        className={cn('text-[13px] font-medium', invalid ? 'text-destructive' : 'text-muted-foreground')}
        nativeID={`label-${label}`}
      >
        {label}
        {optional ? <Text className="text-[13px] text-muted-foreground/70"> · Optional</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.info}
        cursorColor={colors.info}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className="web:outline-none"
        style={{
          marginTop: 2,
          minHeight: minHeight ?? (multiline ? 84 : 30),
          paddingVertical: 4,
          paddingHorizontal: 0,
          fontSize: mono ? 15 : 17,
          lineHeight: multiline ? (mono ? 21 : 23) : undefined,
          fontFamily: mono ? 'IBMPlexMono_500Medium' : undefined,
          color: colors.foreground,
          includeFontPadding: false,
        }}
        {...props}
      />
    </View>
  );
}

/** Label on the left, short value typed on the right (e.g. "Minimum words   250"). */
export function InlineField({
  label,
  suffix,
  invalid,
  ...props
}: InputProps & { label: string; suffix?: string; invalid?: boolean }) {
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 px-4">
      <Text className={cn('flex-1 text-[17px]', invalid && 'text-destructive')}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.info}
        className="web:outline-none"
        style={{
          minWidth: 56,
          height: 52,
          paddingVertical: 0,
          textAlign: 'right',
          fontSize: 17,
          color: colors.mutedForeground,
          fontVariant: ['tabular-nums'],
          includeFontPadding: false,
        }}
        {...props}
      />
      {suffix ? <Text className="text-[17px] text-muted-foreground">{suffix}</Text> : null}
    </View>
  );
}

/** iOS selection list row with a trailing checkmark. */
export function CheckRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className="min-h-[48px] flex-row items-center gap-3 px-4 py-2.5 active:bg-muted"
    >
      <Text className="flex-1 text-[17px]">{label}</Text>
      {selected ? <Check size={20} strokeWidth={2.6} color={colors.info} /> : null}
    </Pressable>
  );
}
