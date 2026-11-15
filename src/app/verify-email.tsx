import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { AuthHeading, AuthScreen, enter, FormError, haptic, PrimaryButton, reflow, useShake } from '@/components/auth-ui';
import { CodeInput, EMAIL_CODE_LENGTH } from '@/components/code-input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';
import { SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';

/** Digits in the emailed code; matches the project's "Email OTP Length" setting. */
const CODE_LENGTH = EMAIL_CODE_LENGTH;
/** Supabase allows one email per address per minute by default. */
const RESEND_SECONDS = 60;

/**
 * Step 2 of Create account: type the code from the "Confirm sign up" email.
 * Also reached from Log in when the account's email was never confirmed (`resend=1`).
 */
export default function VerifyEmail() {
  const { email, resend } = useLocalSearchParams<{ email?: string; resend?: string }>();
  const { verifyEmailCode, resendEmailCode } = useAuth();
  const { style: shakeStyle, shake } = useShake();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(resend === '1' ? 0 : RESEND_SECONDS);
  const [sending, setSending] = useState(false);
  const autoSent = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendNew = useCallback(async () => {
    if (!email || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      await resendEmailCode(email);
      setCode('');
      setNotice('We sent a new code. Codes from earlier emails no longer work.');
      setCooldown(RESEND_SECONDS);
      haptic('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Most failures here are the one-per-minute limit; let them try again after it.
      setCooldown(RESEND_SECONDS);
    } finally {
      setSending(false);
    }
  }, [email, sending, resendEmailCode]);

  // Coming from Log in with an unconfirmed email: send a fresh code straight away.
  useEffect(() => {
    if (resend === '1' && !autoSent.current) {
      autoSent.current = true;
      sendNew();
    }
  }, [resend, sendNew]);

  const verify = useCallback(
    async (value: string) => {
      if (!email || busy || value.length !== CODE_LENGTH) return;
      setBusy(true);
      setError('');
      setNotice('');
      haptic('tap');
      try {
        // Success signs the teacher in; the root guard then swaps this screen for the app.
        await verifyEmailCode(email, value);
        haptic('success');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setCode('');
        shake();
        haptic('error');
        setBusy(false);
      }
    },
    [email, busy, verifyEmailCode, shake]
  );

  if (!email) return <Redirect href="/sign-up" />;

  return (
    <AuthScreen>
      <Animated.View entering={ZoomIn.springify().damping(16)} className="items-center">
        <View
          className="items-center justify-center bg-card"
          style={[SMOOTH, { width: 84, height: 84, borderRadius: 20, boxShadow: SHADOW_MD }]}
        >
          <MailCheck size={38} strokeWidth={1.75} color={colors.info} />
        </View>
      </Animated.View>

      <AuthHeading title="Check your email" />
      <Animated.View entering={enter(2)} className="mt-3 items-center">
        <Text className="max-w-[330px] text-center text-[17px] leading-[23px] text-muted-foreground">
          Enter the {CODE_LENGTH}-digit code we sent to{' '}
          <Text className="text-[17px] font-semibold text-foreground">{email}</Text>
        </Text>
      </Animated.View>

      <Animated.View entering={enter(3)} className="mt-9" style={shakeStyle}>
        <CodeInput
          value={code}
          onChange={(c) => {
            setCode(c);
            setError('');
            // Check as soon as the last digit lands (typed, pasted or autofilled).
            if (c.length === CODE_LENGTH) verify(c);
          }}
          length={CODE_LENGTH}
          invalid={!!error}
          editable={!busy}
          autoFocus
        />
        <FormError>{error}</FormError>
        {notice && !error ? (
          <Animated.View entering={FadeIn.duration(200)} className="mt-3 px-1">
            <Text variant="footnote" tone="success">
              {notice}
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      <Animated.View entering={enter(4)} layout={reflow} className="mt-7">
        <PrimaryButton
          label="Verify"
          onPress={() => verify(code)}
          disabled={code.length !== CODE_LENGTH}
          busy={busy}
        />
      </Animated.View>

      <Animated.View entering={enter(5)} layout={reflow} className="mt-7 items-center gap-4">
        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <Text variant="subhead" tone="muted">
            Didn&apos;t get it?
          </Text>
          {cooldown > 0 ? (
            <Text variant="subhead" tone="muted" className="font-mono">
              Send again in 0:{String(cooldown).padStart(2, '0')}
            </Text>
          ) : (
            <Pressable role="button" onPress={sendNew} disabled={sending} hitSlop={8}>
              <Text variant="subhead" tone="info" className="font-semibold">
                {sending ? 'Sending…' : 'Send a new code'}
              </Text>
            </Pressable>
          )}
        </View>
        <Pressable role="link" onPress={() => router.replace('/sign-up')} hitSlop={8}>
          <Text variant="subhead" tone="info" className="font-semibold">
            Use a different email
          </Text>
        </Pressable>
        <Text variant="footnote" tone="muted" className="text-center">
          Can&apos;t find it? Check your spam folder. The code works for 1 hour.
        </Text>
      </Animated.View>
    </AuthScreen>
  );
}
