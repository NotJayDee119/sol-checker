import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useContext, useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';

const BAR_HEIGHT = 66;
const PAD = 5;
const SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

/**
 * Frosted glass: a real blur on iOS (system material) and web (backdrop-filter). Android's blur needs every
 * scene wrapped in a BlurTargetView, so there it falls back to a near-opaque white for legibility.
 */
const GLASS_TINT = Platform.OS === 'ios' ? 'systemChromeMaterialLight' : 'light';
const GLASS_FILL = Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.55)';

/**
 * Floating glass capsule that overlays the screen (content scrolls underneath), with a highlight that
 * glides to the selected tab. It reports its height so screens can pad their scroll content
 * (see `useContext(BottomTabBarHeightContext)` in Screen). Tabs that set `tabBarShowLabel: false` (the camera "Check" button) render only their icon and
 * take no highlight, since the icon is its own button.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [width, setWidth] = useState(0);
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const keyboardOpen = useAndroidKeyboardOpen();
  const count = state.routes.length;
  const tabWidth = width ? (width - PAD * 2) / count : 0;
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const showHighlight = focusedOptions.tabBarShowLabel !== false;

  const x = useSharedValue(0);
  const opacity = useSharedValue(0);
  const placed = useSharedValue(false);

  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth;
    if (!placed.get()) {
      // First layout: jump into place instead of sliding in from the left edge.
      x.set(target);
      placed.set(true);
    } else {
      x.set(withSpring(target, SPRING));
    }
    opacity.set(withTiming(showHighlight ? 1 : 0, { duration: 160 }));
  }, [state.index, tabWidth, showHighlight, x, opacity, placed]);

  const highlightStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    opacity: opacity.get(),
    transform: [{ translateX: x.get() }],
  }));

  // Android resizes the window for the keyboard, which would lift the bar above it; hide it instead.
  if (keyboardOpen) return null;

  return (
    <View
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 16,
        // Taps beside the capsule reach the content underneath.
        pointerEvents: 'box-none',
      }}
    >
      <View
        role="tablist"
        className="w-full max-w-[560px] flex-row self-center"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[SMOOTH, { height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, padding: PAD, boxShadow: SHADOW_MD }]}
      >
        {/* Glass layer, clipped to the capsule (kept separate so the clip doesn't cut the shadow). */}
        <View
          style={[
            StyleSheet.absoluteFill,
            SMOOTH,
            {
              borderRadius: BAR_HEIGHT / 2,
              overflow: 'hidden',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: 'rgba(27, 38, 56, 0.10)',
              pointerEvents: 'none',
            },
          ]}
        >
          {Platform.OS !== 'android' ? (
            <BlurView tint={GLASS_TINT} intensity={80} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_FILL }]} />
        </View>

        {tabWidth ? (
          <Animated.View
            style={[
              SMOOTH,
              {
                backgroundColor: 'rgba(43, 95, 168, 0.12)',
                pointerEvents: 'none',
                position: 'absolute',
                top: PAD,
                bottom: PAD,
                left: PAD,
                borderRadius: (BAR_HEIGHT - PAD * 2) / 2,
              },
              highlightStyle,
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = index === state.index;
          const iconOnly = options.tabBarShowLabel === false;
          const color = focused ? colors.info : colors.mutedForeground;
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              role="tab"
              aria-selected={focused}
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              className="flex-1 items-center justify-center active:opacity-60"
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              {iconOnly ? null : (
                <Text
                  numberOfLines={1}
                  className="mt-0.5 text-[10.5px] font-semibold tracking-[0.1px]"
                  style={{ color }}
                >
                  {label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function useAndroidKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}
