import { Fragment, useState, type ComponentRef, type Ref } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { SHADOW_SM, SMOOTH } from '@/lib/ui-tokens';

/**
 * Digits in the codes Supabase emails (sign-up confirmation and password reset). Must match
 * Supabase → Authentication → Sign In / Providers → Email → "Email OTP Length" (6–10).
 * Override with EXPO_PUBLIC_EMAIL_CODE_LENGTH.
 */
export const EMAIL_CODE_LENGTH = (() => {
  const n = Number(process.env.EXPO_PUBLIC_EMAIL_CODE_LENGTH);
  return Number.isInteger(n) && n >= 6 && n <= 10 ? n : 8;
})();

/**
 * One box per digit, driven by a single invisible TextInput laid over the boxes, so
 * paste, iOS "From Messages/Mail" suggestions and Android autofill all work.
 */
export function CodeInput({
  value,
  onChange,
  length,
  invalid,
  editable = true,
  autoFocus,
  ref,
}: {
  value: string;
  onChange: (code: string) => void;
  length: number;
  invalid?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}) {
  const [focused, setFocused] = useState(false);
  const active = Math.min(value.length, length - 1);
  // Long codes get slimmer boxes and split into two halves ("1234 – 5678") so they're easy to match
  // against the email and still fit a small phone.
  const compact = length > 6;
  const split = compact && length % 2 === 0 ? length / 2 : -1;
  const box = compact
    ? { height: 48, maxWidth: 46, radius: 12, font: 'text-[22px] leading-[28px]' }
    : { height: 58, maxWidth: 56, radius: 14, font: 'text-[26px] leading-[32px]' };

  return (
    <Pressable accessible={false} className="relative">
      <View
        className={compact ? 'flex-row items-center justify-center gap-1.5' : 'flex-row justify-between gap-2'}
        aria-hidden
      >
        {Array.from({ length }, (_, i) => {
          const digit = value[i];
          const isActive = focused && i === active;
          return (
            <Fragment key={i}>
              {i === split ? <View className="mx-0.5 h-[2px] w-2.5 rounded-full bg-input" /> : null}
              <View
                className="flex-1 items-center justify-center bg-card"
                style={[
                  SMOOTH,
                  {
                    height: box.height,
                    maxWidth: box.maxWidth,
                    borderRadius: box.radius,
                    borderWidth: isActive ? 1.5 : 1,
                    borderColor: invalid
                      ? 'rgba(177, 42, 37, 0.55)'
                      : isActive
                        ? 'rgba(43, 95, 168, 0.75)'
                        : colors.border,
                    boxShadow: SHADOW_SM,
                  },
                ]}
              >
                {digit ? (
                  <Animated.View key={digit + i} entering={ZoomIn.duration(140)}>
                    <Text className={`font-mono-bold ${box.font}`}>{digit}</Text>
                  </Animated.View>
                ) : isActive ? (
                  <View className="h-7 w-[2px] rounded-full bg-info" />
                ) : null}
              </View>
            </Fragment>
          );
        })}
      </View>

      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={editable}
        caretHidden
        contextMenuHidden={false}
        accessibilityLabel={`${length}-digit code`}
        accessibilityValue={{ text: value ? value.split('').join(' ') : 'empty' }}
        className="web:outline-none"
        // Invisible but still focusable and tappable across the whole row of boxes.
        style={{ position: 'absolute', inset: 0, opacity: 0.011, color: 'transparent', fontSize: 1 }}
      />
    </Pressable>
  );
}
