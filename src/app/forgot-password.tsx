import { router, useLocalSearchParams } from 'expo-router';
import { KeyRound, LockKeyhole, MailCheck } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, View, type TextInput } from 'react-native';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';

import {
  AuthHeading,
  AuthScreen,
  enter,
  FieldGroup,
  FormError,
  GroupDivider,
  haptic,
  MIN_PASSWORD,
  PasswordToggle,
  PrimaryButton,
  reflow,
  Requirement,
  useShake,
} from '@/components/auth-ui';
import { CodeInput, EMAIL_CODE_LENGTH } from '@/components/code-input';
import { FloatingField } from '@/components/floating-field';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';

/** Digits in the emailed code; matches the project's "Email OTP Length" setting. */
const CODE_LENGTH = EMAIL_CODE_LENGTH;
/** Supabase allows one email per address per minute by default. */
const RESEND_SECONDS = 60;

type Step = 'email' | 'code' | 'password';

const STEP_ICON = { email: KeyRound, code: MailCheck, password: LockKeyhole } as const;

/** Each new step slides in from the right, like a navigation push. */
const slideIn = FadeInRight.springify().damping(22).stiffness(200);

/**
 * Forgot password, in three steps:
 *  1. type your email → Supabase emails a code ("Reset Password" template, {{ .Token }});
 *  2. type the code → checked on its own, which signs in a short-lived reset session;
 *  3. type a new password → saved, and you're logged in.
 */
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { sendPasswordReset, verifyResetCode, resetPassword, cancelPasswordReset } = useAuth();
  const emailShake = useShake();
  const codeShake = useShake();
  const passwordShake = useShake();
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const address = email.trim().toLowerCase();
  const longEnough = password.length >= MIN_PASSWORD;
  const matches = !!confirm && confirm === password;
  const canSave = longEnough && matches;

  function failWith(message: string, shake: () => void) {
    setError(message);
    shake();
    haptic('error');
  }

  function go(next: Step) {
    setError('');
    setNotice('');
    setFocused(false);
    setStep(next);
  }

  // ── Step 1: email ──
  async function sendCode() {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      failWith('Type the email you use for SOL.', emailShake.shake);
      return;
    }
    setBusy(true);
    setError('');
    haptic('tap');
    try {
      await sendPasswordReset(address);
      haptic('success');
      setCode('');
      go('code');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      failWith(e instanceof Error ? e.message : String(e), emailShake.shake);
    } finally {
      setBusy(false);
    }
  }

  // ── Step 2: code ──
  async function checkCode(value = code) {
    if (busy) return;
    if (value.length !== CODE_LENGTH) {
      failWith(`Type the ${CODE_LENGTH}-digit code from the email.`, codeShake.shake);
      return;
    }
    setBusy(true);
    setError('');
    haptic('tap');
    try {
      await verifyResetCode(address, value);
      haptic('success');
      go('password');
      // Focus once the password step has slid in.
      setTimeout(() => passwordRef.current?.focus(), 380);
    } catch (e) {
      setCode('');
      failWith(e instanceof Error ? e.message : String(e), codeShake.shake);
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (busy || cooldown > 0) return;
    setError('');
    setNotice('');
    try {
      await sendPasswordReset(address);
      setCode('');
      setNotice('We sent a new code. Codes from earlier emails no longer work.');
      haptic('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCooldown(RESEND_SECONDS);
    }
  }

  // ── Step 3: new password ──
  async function save() {
    if (busy) return;
    if (!canSave) {
      failWith(
        !longEnough ? `Use at least ${MIN_PASSWORD} characters.` : "The passwords don't match.",
        passwordShake.shake
      );
      return;
    }
    setBusy(true);
    setError('');
    haptic('tap');
    try {
      // The code is already accepted, so this only saves the password. Success signs in and the
      // root guard opens the app.
      await resetPassword(address, code, password);
      haptic('success');
    } catch (e) {
      // The accepted code is kept (code `password_not_saved`), so the teacher just tries again here.
      failWith(e instanceof Error ? e.message : String(e), passwordShake.shake);
      setBusy(false);
    }
  }

  async function backToLogin() {
    await cancelPasswordReset();
    router.replace('/login');
  }

  async function changeEmail() {
    await cancelPasswordReset();
    setCode('');
    setPassword('');
    setConfirm('');
    go('email');
  }

  const Icon = STEP_ICON[step];

  return (
    <AuthScreen>
      <Animated.View key={`icon-${step}`} entering={ZoomIn.springify().damping(16)} className="items-center">
        <View
          className="items-center justify-center bg-card"
          style={[SMOOTH, { width: 84, height: 84, borderRadius: 20, boxShadow: SHADOW_MD }]}
        >
          <Icon size={36} strokeWidth={1.75} color={step === 'password' ? colors.success : colors.info} />
        </View>
      </Animated.View>

      <StepDots step={step} />

      {step === 'email' ? (
        <Animated.View key="email">
          <AuthHeading
            title="Forgot password?"
            subtitle="Type your email and we'll send you a code to set a new password."
          />

          <Animated.View entering={enter(2)} className="mt-9">
            <FieldGroup focused={focused} invalid={!!error} style={emailShake.style}>
              <FloatingField
                label="Email"
                value={email}
                invalid={!!error}
                onChangeText={(t) => {
                  setEmail(t);
                  setError('');
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                editable={!busy}
                autoFocus={!params.email}
              />
            </FieldGroup>
            <FormError>{error}</FormError>
          </Animated.View>

          <Animated.View entering={enter(3)} layout={reflow} className="mt-6">
            <PrimaryButton label="Send code" onPress={sendCode} disabled={!email.trim()} busy={busy} />
          </Animated.View>
        </Animated.View>
      ) : step === 'code' ? (
        <Animated.View key="code" entering={slideIn}>
          <AuthHeading title="Enter the code" step={0} />
          <Text
            className="mt-3 self-center text-center text-[17px] leading-[23px] text-muted-foreground"
            style={{ maxWidth: 330 }}
          >
            If <Text className="text-[17px] font-semibold text-foreground">{address}</Text> has a SOL account, we sent
            it a {CODE_LENGTH}-digit code.
          </Text>

          <Animated.View layout={reflow} className="mt-8" style={codeShake.style}>
            <CodeInput
              value={code}
              onChange={(c) => {
                setCode(c);
                setError('');
                setNotice('');
                // Check as soon as the last digit is in, like iOS verification codes.
                if (c.length === CODE_LENGTH) checkCode(c);
              }}
              length={CODE_LENGTH}
              invalid={!!error}
              editable={!busy}
              autoFocus
            />
            <FormError>{error}</FormError>
            {notice && !error ? (
              <Animated.View entering={FadeIn.duration(200)} className="mt-3 px-1">
                <Text variant="footnote" tone="success" className="text-center">
                  {notice}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>

          <Animated.View layout={reflow} className="mt-7">
            <PrimaryButton
              label="Continue"
              onPress={() => checkCode()}
              disabled={code.length !== CODE_LENGTH}
              busy={busy}
            />
          </Animated.View>

          <Animated.View layout={reflow} className="mt-7 items-center gap-4">
            <View className="flex-row flex-wrap items-center justify-center gap-1">
              <Text variant="subhead" tone="muted">
                Didn&apos;t get it?
              </Text>
              {cooldown > 0 ? (
                <Text variant="subhead" tone="muted" className="font-mono">
                  Send again in 0:{String(cooldown).padStart(2, '0')}
                </Text>
              ) : (
                <Pressable role="button" onPress={resendCode} hitSlop={8}>
                  <Text variant="subhead" tone="info" className="font-semibold">
                    Send a new code
                  </Text>
                </Pressable>
              )}
            </View>
            <Pressable role="link" onPress={changeEmail} hitSlop={8}>
              <Text variant="subhead" tone="info" className="font-semibold">
                Use a different email
              </Text>
            </Pressable>
            <Text variant="footnote" tone="muted" className="text-center">
              Can&apos;t find it? Check your spam folder. The code works for 1 hour.
            </Text>
          </Animated.View>
        </Animated.View>
      ) : (
        <Animated.View key="password" entering={slideIn}>
          <AuthHeading title="Set a new password" step={0} />
          <Text
            className="mt-3 self-center text-center text-[17px] leading-[23px] text-muted-foreground"
            style={{ maxWidth: 330 }}
          >
            Code accepted. Choose a new password for{' '}
            <Text className="text-[17px] font-semibold text-foreground">{address}</Text>.
          </Text>

          <Animated.View layout={reflow} className="mt-8">
            <FieldGroup focused={focused} invalid={!!error} style={passwordShake.style}>
              <FloatingField
                ref={passwordRef}
                label="New password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError('');
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
                editable={!busy}
                trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
              />
              <GroupDivider />
              <FloatingField
                ref={confirmRef}
                label="Confirm new password"
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setError('');
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                secureTextEntry={!showPassword}
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
            </View>
            <FormError>{error}</FormError>
          </Animated.View>

          <Animated.View layout={reflow} className="mt-7">
            <PrimaryButton label="Save new password" onPress={save} disabled={!canSave} busy={busy} />
          </Animated.View>
        </Animated.View>
      )}

      <Animated.View entering={enter(6)} layout={reflow} className="mt-8 items-center">
        <Pressable role="link" onPress={backToLogin} hitSlop={8}>
          <Text variant="subhead" tone="info" className="font-semibold">
            {step === 'password' ? 'Cancel' : 'Back to log in'}
          </Text>
        </Pressable>
      </Animated.View>
    </AuthScreen>
  );
}

/** Three capsules under the icon; the current step's stretches and turns blue. */
function StepDots({ step }: { step: Step }) {
  const index = step === 'email' ? 0 : step === 'code' ? 1 : 2;
  return (
    <View
      className="mt-5 flex-row items-center justify-center gap-1.5"
      accessible
      accessibilityLabel={`Step ${index + 1} of 3`}
    >
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          layout={reflow}
          className={i === index ? 'bg-info' : i < index ? 'bg-info/40' : 'bg-border'}
          style={{ height: 6, width: i === index ? 20 : 6, borderRadius: 3 }}
        />
      ))}
    </View>
  );
}
