import type { AuthError, Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useToast } from '@/components/toast';

import { downloadProfilePhoto, syncProfilePhoto } from './profile-photo';
import { useStore } from './store';
import { supabase } from './supabase';
import type { Teacher } from './types';

/** How often an open app tells the database "still here" (the admin dashboard's online count). */
const HEARTBEAT_MS = 60_000;

/** Profile photo upload state: `error` means it's kept on this phone and retried next launch. */
export type PhotoSync = 'idle' | 'saving' | 'error';

/** The photo changed on this phone (or predates accounts) and isn't in Supabase yet. */
function photoPendingOf(t: Teacher | null | undefined) {
  return !!t && (!!t.photoDirty || (!!t.photo && t.photoPath === undefined));
}

export interface SignUpInput {
  email: string;
  password: string;
  teacherName: string;
  subject: string;
  /** e.g. "Grade 7, Grade 8"; empty when skipped. */
  gradeLevel?: string;
}

interface Auth {
  /** False when the project has no Supabase settings: no sign-in, on-device only. */
  enabled: boolean;
  /** The saved session has been read from storage. */
  ready: boolean;
  /** Pulling this account's profile right after sign-in. */
  syncing: boolean;
  session: Session | null;
  /** Saving the profile photo to Supabase Storage. */
  photoSync: PhotoSync;
  /**
   * Change the profile photo (null removes it). Saved on this phone at once, then uploaded;
   * a banner at the top says when it's done.
   */
  setPhoto: (photo: string | null) => void;
  /**
   * Checks the current password, then saves the new one. Throws with code
   * `wrong_current_password` when the current password is wrong.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves `needsConfirmation: true` when Supabase emailed a code that must be entered first. */
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  /** Checks the emailed sign-up code; success signs the teacher in. */
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  /** Emails a fresh sign-up code. */
  resendEmailCode: (email: string) => Promise<void>;
  /**
   * True between a correct password-reset code and the new password being saved. The reset
   * code signs the teacher in, so the app must stay on the reset screen until then.
   */
  recovering: boolean;
  /** Emails a password-reset code ("Reset Password" template, {{ .Token }}). */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Checks the reset code on its own (step 2 of Forgot password), before the new password is typed. */
  verifyResetCode: (email: string, code: string) => Promise<void>;
  /**
   * Checks the reset code (skipped if it was already accepted) and saves the new password.
   * Success signs the teacher in. Throws with code `password_not_saved` when the code was
   * accepted but the password wasn't, so the screen can retry without a new code.
   */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  /** Leave a half-finished reset (signs the temporary reset session out). */
  cancelPasswordReset: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

/** Error with the Supabase error code kept, so screens can react (e.g. go verify the email). */
export class AuthFailure extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
  }
}

function fail(error: AuthError | Error): never {
  const code = 'code' in error ? String(error.code ?? '') : '';
  const notConfirmed = code === 'email_not_confirmed' || error.message.toLowerCase().includes('not confirmed');
  throw new AuthFailure(authMessage(error), notConfirmed ? 'email_not_confirmed' : code);
}

/** Supabase messages are technical; teachers get one plain sentence instead. */
export function authMessage(error: AuthError | Error) {
  const code = 'code' in error ? String(error.code ?? '') : '';
  const msg = error.message.toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Wrong email or password.';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed'))
    return 'Confirm your email first with the code we sent you.';
  if (code === 'otp_expired' || msg.includes('token has expired') || msg.includes('invalid token'))
    return 'That code is wrong or has expired. Check it, or send a new code.';
  if (code === 'user_already_exists' || msg.includes('already registered'))
    return 'An account with this email already exists. Log in instead.';
  if (code === 'same_password' || msg.includes('should be different'))
    return 'Choose a password you haven’t used for SOL before.';
  if (code === 'weak_password' || msg.includes('password should be'))
    return 'Use a longer password (at least 6 characters).';
  if (code === 'email_address_invalid' || msg.includes('invalid format')) return 'Check the email address.';
  if (code.includes('rate_limit') || msg.includes('rate limit'))
    return 'Too many tries. Wait a minute, then try again.';
  if (msg.includes('network') || msg.includes('fetch')) return 'No internet connection. Check it and try again.';
  return error.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { hydrated, teacher, setTeacher, setTeacherPhoto, clearTeacher } = useStore();
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  // Account whose profile has been pulled (mirrors `pulledFor`, but re-renders when it changes).
  const [pulledUser, setPulledUser] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  // The last upload failed; cleared by the next successful one.
  const [photoFailed, setPhotoFailed] = useState(false);
  // Re-runs the photo push after the pull, or when a newer photo was picked during an upload.
  const [photoTick, setPhotoTick] = useState(0);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // ── Profile: pull once per sign-in, then push local edits ──────────────────
  // The database copy wins on sign-in (e.g. a teacher logging in on a new phone);
  // after that, edits made on this phone are saved back.
  const pulledFor = useRef<string | null>(null);
  // Latest profile for the pull effect, without re-running it on every keystroke.
  const teacherRef = useRef(teacher);
  useEffect(() => {
    teacherRef.current = teacher;
  }, [teacher]);

  // Only hold the screen when there's no profile on the phone yet (fresh sign-in);
  // otherwise refresh in the background so a slow network never blocks app launch.
  // Worked out during render, not set in an effect: otherwise the first signed-in render mounts
  // the navigator on the Welcome screen for one frame, then unmounts it for the spinner, and
  // Expo Router warns that its REMOVE_ROUTES action "was not handled by any navigator".
  const syncing = !!supabase && !!userId && pulledUser !== userId && !teacher?.teacherName;

  useEffect(() => {
    if (!supabase || !userId || !hydrated || pulledFor.current === userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('teachers')
        .select('teacher_name, subject, grade_level, photo_path')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      const meta = session?.user.user_metadata ?? {};
      const metaGrade = typeof meta.grade_level === 'string' ? meta.grade_level : '';
      const local = teacherRef.current;
      if (data?.teacher_name) {
        setTeacher({
          teacherName: data.teacher_name,
          subject: data.subject ?? '',
          // An account made before grade levels existed: keep what's on the phone or in sign-up details.
          gradeLevel: data.grade_level || local?.gradeLevel || metaGrade,
        });
      } else if (local?.teacherName) {
        // Profile typed on this phone before accounts existed: keep it (the push effect saves it).
        setTeacher({ teacherName: local.teacherName, subject: local.subject, gradeLevel: local.gradeLevel ?? '' });
      } else if (typeof meta.teacher_name === 'string' && meta.teacher_name) {
        // Name typed on the Create account screen, before the email was confirmed.
        setTeacher({
          teacherName: meta.teacher_name,
          subject: typeof meta.subject === 'string' ? meta.subject : '',
          gradeLevel: metaGrade,
        });
      }

      // Photo: an unsaved change on this phone wins (the photo push below uploads it);
      // otherwise take the photo saved from another phone, or its removal.
      const remotePath: string | null = data?.photo_path ?? null;
      if (data && !photoPendingOf(local) && remotePath !== (local?.photoPath ?? null)) {
        try {
          const photo = remotePath ? await downloadProfilePhoto(remotePath) : null;
          if (!cancelled) setTeacherPhoto(photo, { photoPath: remotePath });
        } catch {
          // Keep the photo on the phone; try again next launch.
        }
      }
      pulledFor.current = userId;
    })()
      .catch(() => {
        // Offline: carry on with whatever is on the phone; try again next sign-in.
        pulledFor.current = userId;
      })
      .finally(() => {
        if (cancelled) return;
        setPulledUser(userId);
        setPhotoTick((n) => n + 1);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hydrated]);

  useEffect(() => {
    if (!supabase || !userId || pulledFor.current !== userId || !teacher?.teacherName) return;
    supabase
      .from('teachers')
      .update({ teacher_name: teacher.teacherName, subject: teacher.subject, grade_level: teacher.gradeLevel ?? '' })
      .eq('id', userId)
      .then(() => {});
  }, [userId, teacher?.teacherName, teacher?.subject, teacher?.gradeLevel, pulledUser]);

  // ── Profile photo: upload local changes to the "avatars" bucket ─────────────
  const photoPending = photoPendingOf(teacher);
  const pushingPhoto = useRef(false);
  /** The teacher just changed the photo in Settings: say when it's saved (not for silent retries). */
  const announcePhoto = useRef(false);

  useEffect(() => {
    if (!supabase || !userId || pulledFor.current !== userId || !photoPending || pushingPhoto.current) return;
    const photo = teacher?.photo ?? null;
    pushingPhoto.current = true;
    const unchanged = () => !!teacherRef.current && (teacherRef.current.photo ?? null) === photo;
    syncProfilePhoto(userId, photo)
      .then((path) => {
        pushingPhoto.current = false;
        setPhotoFailed(false);
        // Only mark it saved if the teacher didn't pick another photo (or sign out) meanwhile.
        if (!unchanged()) {
          setPhotoTick((n) => n + 1);
          return;
        }
        setTeacherPhoto(photo, { photoPath: path });
        if (announcePhoto.current) {
          announcePhoto.current = false;
          toast(
            photo
              ? { title: 'Profile photo updated', message: 'Saved to your account.' }
              : { title: 'Profile photo removed' }
          );
        }
      })
      .catch(() => {
        pushingPhoto.current = false;
        if (!unchanged()) {
          setPhotoTick((n) => n + 1);
          return;
        }
        // Not retried right away (that would loop while offline): the next change or launch retries.
        setPhotoFailed(true);
        if (announcePhoto.current) {
          announcePhoto.current = false;
          toast({
            tone: 'error',
            title: 'Photo not saved to your account',
            message: 'It’s kept on this phone and will upload next time SOL opens online.',
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, photoPending, teacher?.photo, photoTick]);

  const photoSync: PhotoSync = !userId || !photoPending ? 'idle' : photoFailed ? 'error' : 'saving';

  const setPhoto = useCallback(
    (photo: string | null) => {
      setTeacherPhoto(photo);
      if (!supabase || !userId) {
        // On-device only: it's already saved.
        toast({ title: photo ? 'Profile photo updated' : 'Profile photo removed' });
        return;
      }
      setPhotoFailed(false);
      announcePhoto.current = true;
    },
    [setTeacherPhoto, userId, toast]
  );

  // ── Heartbeat while the app is open ────────────────────────────────────────
  useEffect(() => {
    if (!supabase || !userId) return;
    const client = supabase;
    const beat = () => {
      client.rpc('heartbeat').then(() => {});
    };
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [userId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) fail(error);
  }, []);

  const signUp = useCallback(
    async ({ email, password, teacherName, subject, gradeLevel = '' }: SignUpInput) => {
      if (!supabase) return { needsConfirmation: false };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        // Kept on the account so the profile survives an email-confirmation round trip.
        options: { data: { teacher_name: teacherName, subject, grade_level: gradeLevel } },
      });
      if (error) fail(error);
      // With "Confirm email" on, Supabase returns no session and hides whether the email
      // was already taken (an existing address comes back with no identities).
      if (data.user && data.user.identities?.length === 0) {
        throw new Error('An account with this email already exists. Log in instead.');
      }
      if (data.session) {
        // Show the app right away instead of the welcome screen.
        setTeacher({ teacherName, subject, gradeLevel });
        return { needsConfirmation: false };
      }
      return { needsConfirmation: true };
    },
    [setTeacher]
  );

  // The "Confirm sign up" email carries a code ({{ .Token }}) instead of a link.
  // A correct code confirms the email and returns a session, which opens the app; the
  // name typed on Create account comes back from the account's metadata (see the pull above).
  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (error) fail(error);
  }, []);

  const resendEmailCode = useCallback(async (email: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    if (error) fail(error);
  }, []);

  // ── Forgot password ────────────────────────────────────────────────────────
  // Supabase emails a code ("Reset Password" template with {{ .Token }}). A correct code
  // signs the teacher in with a short-lived session that may set a new password.
  /** Email whose reset code was already accepted, so a retry only needs the new password. */
  const codeAcceptedFor = useRef<string | null>(null);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) return;
    // Supabase answers the same way whether or not the email has an account.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) fail(error);
  }, []);

  const verifyResetCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return;
    const address = email.trim().toLowerCase();
    if (codeAcceptedFor.current === address) return;
    // Hold the app closed before the session lands, so the reset screen stays up.
    setRecovering(true);
    const { error } = await supabase.auth.verifyOtp({ email: address, token: code.trim(), type: 'recovery' });
    if (error) {
      setRecovering(false);
      fail(error);
    }
    codeAcceptedFor.current = address;
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      if (!supabase) return;
      // No-op when the code was already accepted on the code step.
      await verifyResetCode(email, code);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw new AuthFailure(authMessage(error), 'password_not_saved');
      }
      codeAcceptedFor.current = null;
      setRecovering(false);
    },
    [verifyResetCode]
  );

  const cancelPasswordReset = useCallback(async () => {
    if (!supabase) return;
    if (codeAcceptedFor.current) {
      codeAcceptedFor.current = null;
      await supabase.auth.signOut();
    }
    setRecovering(false);
  }, []);

  // ── Change password (signed in) ────────────────────────────────────────────
  // Re-checking the current password stops someone holding an unlocked phone from taking over
  // the account, and counts as a fresh sign-in for Supabase's "Secure password change".
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const email = session?.user.email;
      if (!supabase || !email) return;
      const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (checkError) {
        const code = 'code' in checkError ? String(checkError.code ?? '') : '';
        if (code === 'invalid_credentials' || checkError.message.toLowerCase().includes('invalid login credentials')) {
          throw new AuthFailure('Your current password is wrong.', 'wrong_current_password');
        }
        fail(checkError);
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) fail(error);
    },
    [session?.user.email]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    pulledFor.current = null;
    setPulledUser(null);
    setPhotoFailed(false);
    clearTeacher();
  }, [clearTeacher]);

  const value = useMemo<Auth>(
    () => ({
      enabled: !!supabase,
      ready,
      syncing,
      session,
      photoSync,
      setPhoto,
      changePassword,
      signIn,
      signUp,
      verifyEmailCode,
      resendEmailCode,
      recovering,
      sendPasswordReset,
      verifyResetCode,
      resetPassword,
      cancelPasswordReset,
      signOut,
    }),
    [
      ready,
      syncing,
      session,
      photoSync,
      setPhoto,
      changePassword,
      signIn,
      signUp,
      verifyEmailCode,
      resendEmailCode,
      recovering,
      sendPasswordReset,
      verifyResetCode,
      resetPassword,
      cancelPasswordReset,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
