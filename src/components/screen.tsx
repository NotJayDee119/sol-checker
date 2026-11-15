import { BottomTabBarHeightContext } from 'expo-router/js-tabs';
import { useContext, type ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Scrolling page with a 16px side gutter, capped width on tablets/desktop web,
 * and no horizontal page scroll (spec §10). Inside the tabs it also clears the floating tab bar.
 */
export function Screen({
  children,
  className,
  topInset = true,
  ...props
}: ScrollViewProps & { children: ReactNode; className?: string; topInset?: boolean }) {
  const insets = useSafeAreaInsets();
  // Undefined outside the tab navigator; the tab bar overlays content, so leave room for it.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: (topInset ? insets.top : 0) + 12, paddingBottom: 40 + tabBarHeight }}
      scrollIndicatorInsets={tabBarHeight ? { bottom: tabBarHeight } : undefined}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      {...props}
    >
      <View className={cn('w-full max-w-[720px] gap-4 self-center px-4', className)}>{children}</View>
    </ScrollView>
  );
}

export function ScreenTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-end gap-3 pb-1 pt-2">
      <View className="flex-1 gap-1">
        <Text variant="title" role="heading">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Small uppercase heading above a group of cards. */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text variant="overline" tone="muted" className={cn('ml-1 mt-2', className)} role="heading">
      {children}
    </Text>
  );
}
