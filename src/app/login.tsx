import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  AppIcon,
  AuthHeading,
  AuthScreen,
  AuthSwitch,
  enter,
  FieldGroup,
  FormError,
  GroupDivider,
  haptic,
  PasswordToggle,
  PrimaryButton,
  reflow,
  useShake,
} from '@/components/auth-ui';
import { FloatingField } from '@/components/floating-field';
import { Text } from '@/components/ui/text';
import { AuthFailure, useAuth } from '@/lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const { style: shakeStyle, shake } = useShake();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = !!email.trim() && !!password;
  const blur = (field: 'email' | 'password') => setFocused((f) => (f === field ? null : f));

  function fail(message: string) {
    setError(message);
    shake();
    haptic('error');
  }

  async function submit() {
    if (busy) return;
    if (!canSubmit) {
      fail('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError('');
    haptic('tap');
    try {
      // Success flips the root guard and shows the app.
      await signIn(email, password);
    } catch (e) {
      setBusy(false);
      // Right password, but the email was never confirmed: send a fresh code and ask for it.
      if (e instanceof AuthFailure && e.code === 'email_not_confirmed') {
        router.push({ pathname: '/verify-email', params: { email: email.trim().toLowerCase(), resend: '1' } });
        return;
      }
      fail(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <AuthScreen>
      <AppIcon />
      <AuthHeading title="Log in to SOL" subtitle="Check papers and keep your class records in one place." />

      <Animated.View entering={enter(2)} className="mt-9">
        <FieldGroup focused={!!focused} invalid={!!error} style={shakeStyle}>
          <FloatingField
            label="Email"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError('');
            }}
            onFocus={() => setFocused('email')}
            onBlur={() => blur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!busy}
          />
          <GroupDivider />
          <FloatingField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError('');
            }}
            onFocus={() => setFocused('password')}
            onBlur={() => blur('password')}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!busy}
            trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          />
        </FieldGroup>
        <FormError>{error}</FormError>
        <View className="mt-3 items-end px-1">
          <Pressable
            role="link"
            hitSlop={8}
            disabled={busy}
            onPress={() =>
              router.push({
                pathname: '/forgot-password',
                // Carry over what they already typed so they don't type it twice.
                params: email.trim() ? { email: email.trim().toLowerCase() } : {},
              })
            }
          >
            <Text variant="subhead" tone="info" className="font-semibold">
              Forgot password?
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={enter(3)} layout={reflow} className="mt-6">
        <PrimaryButton label="Log in" onPress={submit} disabled={!canSubmit} busy={busy} />
      </Animated.View>

      <Animated.View entering={enter(4)} layout={reflow} className="mt-8">
        <AuthSwitch prompt="New to SOL?" label="Create an account" href="/sign-up" />
      </Animated.View>
    </AuthScreen>
  );
}
