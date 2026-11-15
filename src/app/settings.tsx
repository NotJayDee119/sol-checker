import Constants from 'expo-constants';
import { Camera, CircleHelp } from 'lucide-react-native';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { GroupHeader, InsetDivider, InsetGroup, NavRow } from '@/components/inset-group';
import { StatusRows } from '@/components/status-group';
import { AccountGroup, ProfileFields } from '@/components/teacher-card';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/lib/auth';
import { pickProfilePhoto } from '@/lib/profile-photo';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { enter } from '@/lib/ui-tokens';

const AVATAR = 104;

export default function Settings() {
  const { teacher } = useStore();
  const { session, photoSync, setPhoto } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const name = teacher?.teacherName ?? '';
  const photo = teacher?.photo ?? null;

  async function choose(source: 'camera' | 'library') {
    setError('');
    try {
      setBusy(true);
      const next = await pickProfilePhoto(source);
      if (next) setPhoto(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo couldn't be used. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    setError('');
    setPhoto(null);
  }

  function editPhoto() {
    if (busy) return;
    // Web has no camera picker or action sheet; go straight to the file chooser.
    if (Platform.OS === 'web') {
      choose('library');
      return;
    }
    if (Platform.OS === 'ios') {
      const options = ['Take Photo', 'Choose Photo', ...(photo ? ['Remove Photo'] : []), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: photo ? 2 : undefined,
        },
        (i) => {
          if (i === 0) choose('camera');
          else if (i === 1) choose('library');
          else if (photo && i === 2) remove();
        }
      );
      return;
    }
    // Android dialogs hold three buttons; tapping outside cancels.
    Alert.alert(
      'Profile photo',
      undefined,
      [
        photo ? { text: 'Remove', style: 'destructive', onPress: remove } : { text: 'Cancel', style: 'cancel' },
        { text: 'Take photo', onPress: () => choose('camera') },
        { text: 'Choose photo', onPress: () => choose('library') },
      ],
      { cancelable: true }
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <View className="w-full max-w-[680px] self-center">
        {/* Profile header */}
        <Animated.View entering={enter(0)} className="items-center">
          <Pressable
            role="button"
            accessibilityLabel={photo ? 'Change profile photo' : 'Add profile photo'}
            onPress={editPhoto}
            className="active:opacity-80"
          >
            <View style={{ boxShadow: '0 8px 24px rgba(27, 38, 56, 0.12)', borderRadius: AVATAR / 2 }}>
              <Avatar name={name} photo={photo} size={AVATAR} />
              {busy || photoSync === 'saving' ? (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-black/35">
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </View>
            <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-[3px] border-background bg-info">
              <Camera size={16} color="#fff" strokeWidth={2.2} />
            </View>
          </Pressable>

          <Text role="heading" className="mt-4 text-center text-[26px] font-bold leading-8 tracking-[-0.5px]">
            {name}
          </Text>
          {session?.user.email || teacher?.subject ? (
            <Text className="mt-0.5 text-center text-[15px] text-muted-foreground" numberOfLines={1}>
              {session?.user.email ?? teacher?.subject}
            </Text>
          ) : null}

          <View className="mt-3 flex-row items-center gap-5">
            <Pressable role="button" onPress={editPhoto} hitSlop={8} className="active:opacity-50">
              <Text className="text-[15px] font-medium text-info">{photo ? 'Edit Photo' : 'Add Photo'}</Text>
            </Pressable>
            {Platform.OS === 'web' && photo ? (
              <Pressable role="button" onPress={remove} hitSlop={8} className="active:opacity-50">
                <Text className="text-[15px] font-medium text-destructive">Remove</Text>
              </Pressable>
            ) : null}
          </View>
          {!error && session && photoSync !== 'idle' ? (
            <Animated.View entering={FadeIn.duration(200)} className="mt-2 px-6">
              <Text variant="footnote" className="text-center text-muted-foreground" role="status">
                {photoSync === 'saving'
                  ? 'Saving photo to your account…'
                  : 'Photo kept on this phone. It will be saved to your account next time SOL opens online.'}
              </Text>
            </Animated.View>
          ) : null}
          {error ? (
            <Animated.View entering={FadeIn.duration(200)} className="mt-2 px-6">
              <Text variant="footnote" tone="destructive" className="text-center" role="alert">
                {error}
              </Text>
            </Animated.View>
          ) : null}
        </Animated.View>

        <Animated.View entering={enter(1)} className="mt-9">
          <GroupHeader>Profile</GroupHeader>
          <ProfileFields />
        </Animated.View>

        <Animated.View entering={enter(2)} className="mt-8">
          <GroupHeader>App</GroupHeader>
          <InsetGroup>
            <StatusRows />
            <InsetDivider />
            <NavRow icon={CircleHelp} tint={colors.info} label="How to use SOL" href="/help" />
          </InsetGroup>
        </Animated.View>

        <Animated.View entering={enter(3)} className="mt-8">
          <AccountGroup />
        </Animated.View>

        <Text variant="caption" className="mt-10 text-center text-muted-foreground/70">
          SOL {Constants.expoConfig?.version ?? ''} · Scan · Observe · Learn
        </Text>
      </View>
    </ScrollView>
  );
}
