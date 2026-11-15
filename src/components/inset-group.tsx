import { Link, type Href } from 'expo-router';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { SHADOW_SM, SMOOTH } from '@/lib/ui-tokens';
import { cn } from '@/lib/utils';

/**
 * iOS "inset grouped" list pieces: a rounded white card of rows with inset hairlines between them,
 * a bold section title above and an optional muted footnote below.
 */

export function InsetGroup({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      className={cn('overflow-hidden border border-border bg-card', className)}
      style={[SMOOTH, { borderRadius: 16, boxShadow: SHADOW_SM }, style]}
    >
      {children}
    </View>
  );
}

/** Hairline between rows, inset to line up with the row's text. */
export function InsetDivider({ inset = 16 }: { inset?: number }) {
  return <View className="bg-border" style={{ marginLeft: inset, height: StyleSheet.hairlineWidth * 2 }} />;
}

/** Bold section title with an optional trailing action (e.g. "See all"). */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="mb-2.5 flex-row items-end justify-between px-1">
      <Text role="heading" className="text-[22px] font-bold leading-7 tracking-[-0.4px]">
        {title}
      </Text>
      {action}
    </View>
  );
}

/** Small uppercase label above a group, like iOS Settings. */
export function GroupHeader({ children }: { children: ReactNode }) {
  return (
    <Text role="heading" className="mb-2 ml-4 text-[13px] font-medium uppercase tracking-[0.3px] text-muted-foreground">
      {children}
    </Text>
  );
}

/** Text link styled like an iOS section action. */
export function SectionAction({ label, href }: { label: string; href: Href }) {
  return (
    <Link href={href} asChild>
      <Pressable hitSlop={10} role="link" className="active:opacity-50">
        <Text className="text-[17px] text-info">{label}</Text>
      </Pressable>
    </Link>
  );
}

export function GroupFootnote({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'destructive' }) {
  return (
    <Text
      variant="footnote"
      className={cn('mt-2 px-4', tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground')}
      role={tone === 'destructive' ? 'alert' : undefined}
    >
      {children}
    </Text>
  );
}

/** Small colored squircle holding a white glyph, like the icons in iOS Settings. */
export function IconTile({ icon: IconCmp, tint, size = 30 }: { icon: LucideIcon; tint: string; size?: number }) {
  return (
    <View
      className="items-center justify-center"
      style={[SMOOTH, { width: size, height: size, borderRadius: size * 0.24, backgroundColor: tint }]}
    >
      <IconCmp size={size * 0.6} color="#fff" strokeWidth={2.2} />
    </View>
  );
}

/** Tappable list row: icon tile, label, optional value, chevron. */
export function NavRow({
  icon,
  tint,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
  value?: string;
  href: Href;
}) {
  return (
    <Link href={href} asChild>
      <Pressable role="link" className="min-h-[52px] flex-row items-center gap-3.5 px-4 active:bg-muted">
        <IconTile icon={icon} tint={tint} />
        <Text className="flex-1 text-[17px]" numberOfLines={1}>
          {label}
        </Text>
        {value ? <Text className="text-[17px] text-muted-foreground">{value}</Text> : null}
        <ChevronRight size={18} strokeWidth={2.25} color={colors.placeholder} />
      </Pressable>
    </Link>
  );
}
