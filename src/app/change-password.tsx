import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View, type TextInput } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  enter,
  FieldGroup,
  FormError,
  GroupDivider,
  GroupLabel,
  haptic,
  MIN_PASSWORD,
  PasswordToggle,
  PrimaryButton,
  reflow,
  Requirement,
  useShake,
} from '@/components/auth-ui';
import { FloatingField } from '@/components/floating-field';
import { useToast } from '@/components/toast';
import { Text } from '@/components/ui/text';
import { AuthFailure, useAuth } from '@/lib/auth';

/** Change the password of the signed-in account. Needs the current password first. */
export default function ChangePassword() {
  const { changePassword } = useAuth();
  const toast = useToast();
  const currentShake = useShake();
  const newShake = useShake();
  const newRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [focused, setFocused] = useState<'current' | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  /** Which group the error belongs to, so only that one turns red and shakes. */
  const [error, setError] = useState<{ on: 'current' | 'new'; message: string } | null>(null);

  const longEnough = password.length >= MIN_PASSWORD;
  const matches = !!confirm && confirm === password;
  const different = !!password && password !== current;
  const canSave = !!current && longEnough && matches && different;

  function failOn(on: 'current' | 'new', message: string) {
    setError({ on, message });
    (on === 'current' ? currentShake : newShake).shake();
    haptic('error');
  }

  async function save() {
    if (busy) return;
    if (!current) return failOn('current', 'Type your current password.');
    if (!longEnough) return failOn('new', `Use at least ${MIN_PASSWORD} characters.`);
    if (!matches) return failOn('new', "The new passwords don't match.");
    if (!different) return failOn('new', 'Choose a password different from your current one.');

    setBusy(true);
    setError(null);
    haptic('tap');
    try {
      await changePassword(current, password);
      toast({ title: 'Password changed', message: 'Use your new password next time you log in.' });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (e instanceof AuthFailure && e.code === 'wrong_current_password') {
        setCurrent('');
        failOn('current', message);
      } else {
        failOn('new', message);
      }
      setBusy(false);
    }
  }

  const clearError = () => setError(null);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <View className="w-full max-w-[480px] self-center">
        <Animated.View entering={enter(0)}>
          <GroupLabel>Current password</GroupLabel>
          <FieldGroup focused={focused === 'current'} invalid={error?.on === 'current'} style={currentShake.style}>
            <FloatingField
              label="Current password"
              value={current}
              invalid={error?.on === 'current'}
              onChangeText={(t) => {
                setCurrent(t);
                clearError();
              }}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => newRef.current?.focus()}
              editable={!busy}
              autoFocus
              trailing={<PasswordToggle visible={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />}
            />
          </FieldGroup>
          {error?.on === 'current' ? <FormError>{error.message}</FormError> : null}
        </Animated.View>

        <Animated.View entering={enter(1)} layout={reflow} className="mt-8">
          <GroupLabel>New password</GroupLabel>
          <FieldGroup focused={focused === 'new'} invalid={error?.on === 'new'} style={newShake.style}>
            <FloatingField
              ref={newRef}
              label="New password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearError();
              }}
              onFocus={() => setFocused('new')}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmRef.current?.focus()}
              editable={!busy}
              trailing={<PasswordToggle visible={showNew} onToggle={() => setShowNew((v) => !v)} />}
            />
            <GroupDivider />
            <FloatingField
              ref={confirmRef}
              label="Confirm new password"
              value={confirm}
              onChangeText={(t) => {
                setConfirm(t);
                clearError();
              }}
              onFocus={() => setFocused('new')}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={save}
              editable={!busy}
            />
          </FieldGroup>

          <View className="mt-3 gap-1.5 px-1">
            <Requirement met={longEnough} label={`At least ${MIN_PASSWORD} characters`} />
            <Requirement met={matches} label="Passwords match" />
            <Requirement met={different} label="Different from your current password" />
          </View>
          {error?.on === 'new' ? <FormError>{error.message}</FormError> : null}
        </Animated.View>

        <Animated.View entering={enter(2)} layout={reflow} className="mt-8">
          <PrimaryButton label="Change Password" onPress={save} disabled={!canSave} busy={busy} />
        </Animated.View>

        <Animated.View entering={enter(3)} layout={reflow} className="mt-5 px-4">
          <Text variant="footnote" tone="muted" className="text-center">
            Forgot your current password? Log out, then tap “Forgot password?” on the log-in screen.
          </Text>
        </Animated.View>
      </View>
    </ScrollView>
  );
}
