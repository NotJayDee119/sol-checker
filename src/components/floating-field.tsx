import { useEffect, useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/lib/theme';

export const FLOATING_FIELD_HEIGHT = 58;

export type FloatingFieldProps = Omit<TextInputProps, 'placeholder'> & {
  label: string;
  /** Rendered at the trailing edge of the row (e.g. a show/hide password button). */
  trailing?: ReactNode;
  /** Tints the label red. */
  invalid?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

/**
 * Borderless input row whose label sits inside the field and floats up when it's focused or filled,
 * like Apple's account sign-in. Meant to be stacked inside a grouped, rounded container.
 */
export function FloatingField({
  label,
  value,
  trailing,
  invalid,
  onFocus,
  onBlur,
  style,
  ref,
  ...props
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false);
  const raised = focused || !!value;
  const progress = useSharedValue(raised ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(raised ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) }));
  }, [raised, progress]);

  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.get(), [0, 1], [0, -11]) },
      { scale: interpolate(progress.get(), [0, 1], [1, 0.76]) },
    ],
  }));

  return (
    <View className="flex-row items-center" style={{ height: FLOATING_FIELD_HEIGHT }}>
      <View className="flex-1 justify-center" style={{ height: FLOATING_FIELD_HEIGHT }}>
        <Animated.Text
          numberOfLines={1}
          style={[
            {
              position: 'absolute',
              left: 16,
              right: 16,
              fontSize: 17,
              lineHeight: 22,
              color: invalid ? colors.destructive : colors.mutedForeground,
              transformOrigin: 'left center',
              pointerEvents: 'none',
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          ref={ref}
          value={value}
          accessibilityLabel={label}
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.info}
          cursorColor={colors.info}
          className="web:outline-none"
          style={[
            {
              height: FLOATING_FIELD_HEIGHT,
              paddingTop: 22,
              paddingBottom: 4,
              paddingHorizontal: 16,
              fontSize: 17,
              color: colors.foreground,
              includeFontPadding: false,
            },
            style,
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {trailing}
    </View>
  );
}
