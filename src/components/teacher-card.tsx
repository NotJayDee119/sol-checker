import { KeyRound } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, TextInput, View } from 'react-native';

import { GroupFootnote, InsetDivider, InsetGroup, NavRow } from '@/components/inset-group';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';

/**
 * Teacher profile as iOS Settings-style rows: name, subject and grade level, saved ~900 ms after typing stops
 * (spec §3.1 step 2).
 */
export function ProfileFields() {
  const { teacher, setTeacher } = useStore();
  const [name, setName] = useState(teacher?.teacherName ?? '');
  const [subject, setSubject] = useState(teacher?.subject ?? '');
  const [grade, setGrade] = useState(teacher?.gradeLevel ?? '');
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Keep the last non-empty name so clearing the field doesn't sign the teacher out of the app.
    const t = setTimeout(() => {
      if (name.trim()) setTeacher({ teacherName: name.trim(), subject: subject.trim(), gradeLevel: grade.trim() });
    }, 900);
    return () => clearTimeout(t);
  }, [name, subject, grade, setTeacher]);

  return (
    <View>
      <InsetGroup>
        <FormRow label="Name">
          <RowInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ma'am Reyes"
            autoCapitalize="words"
            accessibilityLabel="Your name"
          />
        </FormRow>
        <InsetDivider />
        <FormRow label="Subject">
          <RowInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Filipino 8"
            accessibilityLabel="Subject you teach"
          />
        </FormRow>
        <InsetDivider />
        <FormRow label="Grade">
          <RowInput
            value={grade}
            onChangeText={setGrade}
            placeholder="e.g. Grade 7, Grade 8"
            accessibilityLabel="Grade levels you teach"
          />
        </FormRow>
      </InsetGroup>
      {name.trim() ? (
        <GroupFootnote>Your papers are private — they&apos;re saved only on this phone.</GroupFootnote>
      ) : (
        <GroupFootnote tone="destructive">Your name is needed.</GroupFootnote>
      )}
    </View>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 pl-4">
      <Text className="text-[17px]">{label}</Text>
      <View className="flex-1">{children}</View>
    </View>
  );
}

function RowInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.placeholder}
      selectionColor={colors.info}
      cursorColor={colors.info}
      returnKeyType="done"
      className="web:outline-none"
      style={{
        height: 52,
        paddingRight: 16,
        paddingVertical: 0,
        textAlign: 'right',
        fontSize: 17,
        color: colors.mutedForeground,
        includeFontPadding: false,
      }}
      {...props}
    />
  );
}

/** Who is signed in, with a way out. Hidden when the app runs without Supabase. */
export function AccountGroup() {
  const { enabled, session, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!enabled || !session) return null;

  const confirmSignOut = () => {
    const run = async () => {
      setBusy(true);
      try {
        await signOut();
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') {
      // Alert.alert has no buttons on web.
      if (window.confirm('Log out of SOL on this device?')) run();
      return;
    }
    Alert.alert('Log out?', 'You can log back in any time with your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <InsetGroup>
      <View className="min-h-[52px] flex-row items-center gap-3 px-4">
        <Text className="text-[17px]">Account</Text>
        <Text className="flex-1 text-right text-[17px] text-muted-foreground" numberOfLines={1}>
          {session.user.email}
        </Text>
      </View>
      <InsetDivider />
      <NavRow icon={KeyRound} tint={colors.warning} label="Change Password" href="/change-password" />
      <InsetDivider />
      <Pressable
        role="button"
        onPress={confirmSignOut}
        disabled={busy}
        className="min-h-[52px] flex-row items-center justify-center active:bg-muted"
      >
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text className="text-[17px] text-destructive">Log Out</Text>
        )}
      </Pressable>
    </InsetGroup>
  );
}
