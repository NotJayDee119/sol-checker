import * as Haptics from 'expo-haptics';
import { CircleAlert, CircleCheck, Info, type LucideIcon } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  message?: string;
  tone?: ToastTone;
}

interface ToastState extends Required<Pick<ToastInput, 'title' | 'tone'>> {
  id: number;
  message?: string;
}

const TONES: Record<ToastTone, { icon: LucideIcon; color: string }> = {
  success: { icon: CircleCheck, color: colors.success },
  error: { icon: CircleAlert, color: colors.destructive },
  info: { icon: Info, color: colors.info },
};

/** Errors stay a little longer so there's time to read what to do. */
const DURATION: Record<ToastTone, number> = { success: 2800, info: 3200, error: 5000 };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/**
 * Short confirmation banner that slides down from the top ("Profile photo updated").
 * One at a time: a new toast replaces the current one. Tap to dismiss.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(1);

  const show = useCallback(({ title, message, tone = 'success' }: ToastInput) => {
    setToast({ id: nextId.current++, title, message, tone });
    if (Platform.OS !== 'web' && tone !== 'info') {
      Haptics.notificationAsync(
        tone === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }
    AccessibilityInfo.announceForAccessibility(message ? `${title}. ${message}` : title);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast((cur) => (cur?.id === toast.id ? null : cur)), DURATION[toast.tone]);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => show, [show]);
  const tone = toast ? TONES[toast.tone] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 items-center px-4"
        style={{ top: insets.top + 8 }}
      >
        {toast && tone ? (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.springify().damping(18).stiffness(180)}
            exiting={FadeOutUp.duration(180)}
            className="w-full max-w-[440px]"
          >
            <Pressable
              role="alert"
              accessibilityHint="Tap to dismiss"
              onPress={() => setToast(null)}
              className="flex-row items-center gap-3 border border-border bg-card px-4 py-3 active:opacity-90"
              style={[SMOOTH, { borderRadius: 18, boxShadow: SHADOW_MD }]}
            >
              <tone.icon size={22} color={tone.color} strokeWidth={2.2} />
              <View className="flex-1">
                <Text className="text-[15px] font-semibold leading-5">{toast.title}</Text>
                {toast.message ? (
                  <Text className="text-[13px] leading-[18px] text-muted-foreground">{toast.message}</Text>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

/** `toast({ title, message?, tone? })` from anywhere inside <ToastProvider>. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
