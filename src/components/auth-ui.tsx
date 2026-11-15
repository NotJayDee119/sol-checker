import * as Haptics from 'expo-haptics';
import { Link, type Href } from 'expo-router';
import { Check, CircleAlert, Eye, EyeOff } from 'lucide-react-native';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { enter, reflow, SHADOW_MD, SHADOW_SM, SMOOTH } from '@/lib/ui-tokens';
import { cn } from '@/lib/utils';

/** Shortest password Supabase accepts by default (Authentication → Providers → Email). */
export const MIN_PASSWORD = 6;

/**
 * Shared building blocks for the Apple-style sign-in screens (login, sign-up):
 * squircle app icon, centered heading, grouped inset fields, dark primary button.
 */

const LOGO = require('../../assets/logo-mark.png');

export { enter, reflow, SMOOTH };

export function haptic(kind: 'error' | 'success' | 'tap') {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'tap'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(
          kind === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
        );
  p.catch(() => {});
}

/** The classic "wrong password" side-to-side shake. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const shake = () =>
    x.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(9, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(4, { duration: 60 }),
        withTiming(0, { duration: 50 })
      )
    );
  return { style, shake };
}

/** Keyboard-aware, vertically centered page with a 400px column. */
export function AuthScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[400px] self-center">{children}</View>
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** App logo on a white squircle tile, like an iOS home-screen icon. */
export function AppIcon({ size = 92 }: { size?: number }) {
  return (
    <Animated.View entering={FadeIn.duration(600)} className="items-center">
      <View
        className="items-center justify-center bg-card"
        style={[
          SMOOTH,
          {
            width: size,
            height: size,
            borderRadius: size * 0.24,
            boxShadow: SHADOW_MD,
          },
        ]}
        accessible
        accessibilityLabel="SOL logo"
      >
        <Image source={LOGO} style={{ width: size * 0.78, height: size * 0.78 }} resizeMode="contain" />
      </View>
    </Animated.View>
  );
}

export function AuthHeading({ title, subtitle, step = 1 }: { title: string; subtitle?: string; step?: number }) {
  return (
    <Animated.View entering={enter(step)} className="mt-7 items-center gap-2">
      <Text role="heading" className="text-center text-[32px] font-bold leading-[38px] tracking-[-0.6px]">
        {title}
      </Text>
      {subtitle ? (
        <Text className="max-w-[320px] text-center text-[17px] leading-[23px] text-muted-foreground">{subtitle}</Text>
      ) : null}
    </Animated.View>
  );
}

/** Small label above a field group, like an iOS Settings section header. */
export function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <Text variant="footnote" className="mb-2 ml-4 text-muted-foreground" role="heading">
      {children}
    </Text>
  );
}

/** Rounded white card holding stacked FloatingField rows. Tints blue while focused, red when invalid. */
export function FieldGroup({
  focused,
  invalid,
  style,
  children,
}: {
  focused?: boolean;
  invalid?: boolean;
  style?: ComponentProps<typeof Animated.View>['style'];
  children: ReactNode;
}) {
  return (
    <Animated.View
      className="overflow-hidden bg-card"
      style={[
        SMOOTH,
        {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: invalid ? 'rgba(177, 42, 37, 0.45)' : focused ? 'rgba(43, 95, 168, 0.55)' : colors.border,
          boxShadow: SHADOW_SM,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Inset hairline between rows of a FieldGroup. */
export function GroupDivider() {
  return <View className="ml-4 bg-border" style={{ height: StyleSheet.hairlineWidth * 2 }} />;
}

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <Pressable
      role="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      onPress={onToggle}
      hitSlop={6}
      className="mr-1.5 h-11 w-11 items-center justify-center rounded-full active:bg-muted"
    >
      <Icon size={20} strokeWidth={1.75} color={colors.mutedForeground} />
    </Pressable>
  );
}

/** Fades in under a group. Renders nothing when there's no message. */
export function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      className="mt-3 flex-row items-start gap-2 px-1"
      role="alert"
    >
      <CircleAlert size={16} strokeWidth={2} color={colors.destructive} style={{ marginTop: 1 }} />
      <Text variant="footnote" tone="destructive" className="flex-1">
        {children}
      </Text>
    </Animated.View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const inactive = !!disabled || !!busy;
  return (
    <PressableScale
      role="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: !!busy }}
      disabled={inactive}
      onPress={onPress}
      scaleTo={0.98}
      className="h-[54px] flex-row items-center justify-center bg-foreground"
      style={[SMOOTH, { borderRadius: 14, opacity: disabled && !busy ? 0.35 : 1 }]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-[17px] font-semibold tracking-[-0.2px] text-white">{label}</Text>
      )}
    </PressableScale>
  );
}

/** "New to SOL? Create an account" style line. */
export function AuthSwitch({ prompt, label, href }: { prompt: string; label: string; href: Href }) {
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-1">
      <Text variant="subhead" tone="muted">
        {prompt}
      </Text>
      <Link href={href} replace asChild>
        <Text variant="subhead" tone="info" className="font-semibold" role="link">
          {label}
        </Text>
      </Link>
    </View>
  );
}

/** One line of a password checklist; the circle fills green once the rule is met. */
export function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <View className="flex-row items-center gap-2" accessible accessibilityLabel={`${label}${met ? ', done' : ''}`}>
      <View
        className={cn('h-4 w-4 items-center justify-center rounded-full', met ? 'bg-success' : 'border border-input')}
      >
        {met ? (
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <Check size={11} strokeWidth={3} color="#fff" />
          </Animated.View>
        ) : null}
      </View>
      <Text variant="footnote" className={met ? 'text-success' : 'text-muted-foreground'}>
        {label}
      </Text>
    </View>
  );
}
