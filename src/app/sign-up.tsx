import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type TextInput,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppIcon,
  AuthHeading,
  AuthSwitch,
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
import { FloatingField } from '@/components/floating-field';
import { formatGrades, GradePicker } from '@/components/grade-picker';
import { InsetGroup } from '@/components/inset-group';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

type FieldKey = 'name' | 'subject' | 'email' | 'password' | 'confirm';
type Errors = Partial<Record<Exclude<FieldKey, 'subject'> | 'form', string>>;
type Step = 0 | 1 | 2;

const STEPS = 3;
const STEP_TITLES = ['About you', 'Grade levels', 'Account'] as const;

/** iOS-like push: quick, and settles without bouncing. */
const SLIDE = { damping: 26, stiffness: 240, mass: 0.9 };

/**
 * Create account in three pages that slide like a navigation push:
 * 1. About you — name and subject.  2. Grade levels.  3. Account — email and password.
 */
export default function SignUp() {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [grades, setGrades] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<FieldKey | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const subjectRef = useRef<ComponentRef<typeof TextInput>>(null);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmRef = useRef<ComponentRef<typeof TextInput>>(null);

  const profileShake = useShake();
  const accountShake = useShake();

  // 0 = About you, 1 = Grade levels, 2 = Account. Drives the slide and the step dots.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withSpring(step, SLIDE));
  }, [step, progress]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -progress.get() * width }] }));
  // Android back button steps back one page, and from About you returns to Log in.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  const longEnough = password.length >= MIN_PASSWORD;
  const matches = !!confirm && confirm === password;
  const canSubmit = !!email.trim() && !!password && !!confirm;
  const firstName = name.trim().split(/\s+/).slice(-1)[0] ?? '';
  const gradeSummary = formatGrades(grades);

  const clear = (key: keyof Errors) =>
    setErrors((e) => (e[key] || e.form ? { ...e, [key]: undefined, form: undefined } : e));
  const focus = (key: FieldKey) => ({
    onFocus: () => setFocused(key),
    onBlur: () => setFocused((f) => (f === key ? null : f)),
  });

  function toGrades() {
    if (!name.trim()) {
      setErrors((e) => ({ ...e, name: 'Type your name so your papers show who checked them.' }));
      profileShake.shake();
      haptic('error');
      return;
    }
    haptic('tap');
    // The grade page has no text fields, so put the keyboard away.
    Keyboard.dismiss();
    setStep(1);
  }

  function toAccount() {
    haptic('tap');
    setStep(2);
    // Focus once the page has slid in, so the keyboard doesn't fight the animation.
    setTimeout(() => emailRef.current?.focus(), 420);
  }

  function back() {
    haptic('tap');
    Keyboard.dismiss();
    // Log in and Sign up swap with replace, so there's no history to pop: go to Log in directly.
    if (step === 0) router.replace('/login');
    else setStep((step - 1) as Step);
  }

  function validateAccount(): Errors {
    const e: Errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Type a valid email address.';
    if (password.length < MIN_PASSWORD) e.password = `Use at least ${MIN_PASSWORD} characters.`;
    else if (confirm !== password) e.confirm = "The passwords don't match.";
    return e;
  }

  async function submit() {
    if (busy) return;
    const e = validateAccount();
    setErrors(e);
    if (Object.keys(e).length) {
      accountShake.shake();
      haptic('error');
      return;
    }
    setBusy(true);
    haptic('tap');
    try {
      const { needsConfirmation } = await signUp({
        email,
        password,
        teacherName: name.trim(),
        subject: subject.trim(),
        gradeLevel: gradeSummary,
      });
      // Without confirmation the root guard opens the app as soon as the session lands.
      // With it, Supabase has emailed a code: go type it in.
      if (needsConfirmation) {
        haptic('success');
        router.replace({ pathname: '/verify-email', params: { email: email.trim().toLowerCase() } });
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : String(err) });
      accountShake.shake();
      haptic('error');
    } finally {
      setBusy(false);
    }
  }

  const profileFocused = focused === 'name' || focused === 'subject';
  const accountFocused = focused === 'email' || focused === 'password' || focused === 'confirm';
  const accountError = errors.email ?? errors.password ?? errors.confirm;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Fixed top bar: Back (to Log in from About you, else the previous page) and step dots */}
      <View className="flex-row items-center px-3" style={{ paddingTop: insets.top + 6, height: insets.top + 50 }}>
        <View style={{ width: 88 }}>
          <Pressable
            role="button"
            accessibilityLabel={step === 0 ? 'Back to Log in' : `Back to ${STEP_TITLES[step - 1]}`}
            onPress={back}
            disabled={busy}
            hitSlop={10}
            className="flex-row items-center active:opacity-50"
          >
            <ChevronLeft size={26} color={colors.info} strokeWidth={2.2} />
            <Text className="-ml-0.5 text-[17px] text-info">Back</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center">
          <StepDots step={step} progress={progress} />
        </View>
        <View style={{ width: 88 }} />
      </View>

      <View className="flex-1 overflow-hidden">
        <Animated.View className="flex-1 flex-row" style={[{ width: width * STEPS }, rowStyle]}>
          {/* ── Page 1: About you ── */}
          <Page index={0} width={width} active={step === 0} progress={progress} bottomInset={insets.bottom}>
            <AppIcon size={68} />
            <AuthHeading title="About you" subtitle="Tell us about your teaching. You can change this later." />

            <Animated.View entering={enter(2)} className="mt-9">
              <FieldGroup focused={profileFocused} invalid={!!errors.name} style={profileShake.style}>
                <FloatingField
                  label="Your name"
                  value={name}
                  invalid={!!errors.name}
                  onChangeText={(t) => {
                    setName(t);
                    clear('name');
                  }}
                  {...focus('name')}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => subjectRef.current?.focus()}
                />
                <GroupDivider />
                <FloatingField
                  ref={subjectRef}
                  label="Subject you teach (optional)"
                  value={subject}
                  onChangeText={setSubject}
                  {...focus('subject')}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={toGrades}
                />
              </FieldGroup>
              <FormError>{errors.name}</FormError>
            </Animated.View>

            <Animated.View entering={enter(3)} layout={reflow} className="mt-7">
              <PrimaryButton label="Continue" onPress={toGrades} disabled={!name.trim()} />
            </Animated.View>

            <Animated.View entering={enter(4)} layout={reflow} className="mt-8">
              <AuthSwitch prompt="Already have an account?" label="Log in" href="/login" />
            </Animated.View>
          </Page>

          {/* ── Page 2: Grade levels ── */}
          <Page index={1} width={width} active={step === 1} progress={progress} bottomInset={insets.bottom}>
            <AppIcon size={68} />
            <AuthHeading
              title="Grade levels"
              subtitle={`${firstName ? `Nice to meet you, ${firstName}! ` : ''}Which grades do you teach? This is optional.`}
            />

            <View className="mt-9">
              <InsetGroup className="p-4">
                <GradePicker value={grades} onChange={setGrades} />
              </InsetGroup>
              <Text variant="footnote" tone="muted" className="mt-2 px-4" numberOfLines={2}>
                {gradeSummary || 'Tap every grade you handle.'}
              </Text>
            </View>

            <Animated.View layout={reflow} className="mt-7">
              <PrimaryButton label={grades.length ? 'Continue' : 'Skip for now'} onPress={toAccount} />
            </Animated.View>
          </Page>

          {/* ── Page 3: Account ── */}
          <Page index={2} width={width} active={step === 2} progress={progress} bottomInset={insets.bottom}>
            <AppIcon size={68} />
            <AuthHeading
              title="Create your account"
              subtitle={`${firstName ? `Hi, ${firstName}! ` : ''}Last step — set up how you'll log in.`}
            />

            <View className="mt-9">
              <FieldGroup focused={accountFocused} invalid={!!accountError || !!errors.form} style={accountShake.style}>
                <FloatingField
                  ref={emailRef}
                  label="Email"
                  value={email}
                  invalid={!!errors.email}
                  onChangeText={(t) => {
                    setEmail(t);
                    clear('email');
                  }}
                  {...focus('email')}
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
                  invalid={!!errors.password}
                  onChangeText={(t) => {
                    setPassword(t);
                    clear('password');
                    clear('confirm');
                  }}
                  {...focus('password')}
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
                  label="Confirm password"
                  value={confirm}
                  invalid={!!errors.confirm}
                  onChangeText={(t) => {
                    setConfirm(t);
                    clear('confirm');
                  }}
                  {...focus('confirm')}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  editable={!busy}
                />
              </FieldGroup>

              {/* Live password checklist */}
              <View className="mt-3 gap-1.5 px-1">
                <Requirement met={longEnough} label={`At least ${MIN_PASSWORD} characters`} />
                <Requirement met={matches} label="Passwords match" />
              </View>
              <FormError>{accountError ?? errors.form}</FormError>
            </View>

            <Animated.View layout={reflow} className="mt-7">
              <PrimaryButton label="Create account" onPress={submit} disabled={!canSubmit} busy={busy} />
            </Animated.View>

            <Animated.View layout={reflow} className="mt-8">
              <Text variant="caption" className="px-4 text-center leading-[17px] text-muted-foreground/80">
                Record only learner names and sections — no LRNs or other personal data.
              </Text>
            </Animated.View>
          </Page>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** One full-width page of the pager, scrolling on its own. Off-screen pages ignore taps and screen readers. */
function Page({
  index,
  width,
  active,
  progress,
  bottomInset,
  children,
}: {
  index: number;
  width: number;
  active: boolean;
  progress: SharedValue<number>;
  bottomInset: number;
  children: ReactNode;
}) {
  // A page fades a little as it slides away from the center.
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(progress.get() - index), [0, 1], [1, 0.2], 'clamp'),
  }));
  return (
    <Animated.View
      style={[{ width, pointerEvents: active ? 'auto' : 'none' }, style]}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!active}
      aria-hidden={!active}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: 8,
          paddingBottom: bottomInset + 24,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[400px] self-center">{children}</View>
      </ScrollView>
    </Animated.View>
  );
}

/** One capsule per step; the current step's stretches and turns blue. */
function StepDots({ step, progress }: { step: Step; progress: SharedValue<number> }) {
  return (
    <View className="flex-row items-center gap-1.5" accessible accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <Dot key={i} index={i} progress={progress} />
      ))}
    </View>
  );
}

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = 1 - Math.min(Math.abs(progress.get() - index), 1);
    return {
      width: interpolate(t, [0, 1], [8, 24]),
      backgroundColor: interpolateColor(t, [0, 1], [colors.border, colors.info]),
    };
  });
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
}
