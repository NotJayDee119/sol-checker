import { router } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import {
  Calculator,
  Camera,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  PenLine,
  TriangleAlert,
} from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Avatar } from '@/components/avatar';
import { IconTile, InsetDivider, InsetGroup, NavRow, SectionAction, SectionHeader } from '@/components/inset-group';
import { LiveClock } from '@/components/live-clock';
import { PressableScale } from '@/components/pressable-scale';
import { Text } from '@/components/ui/text';
import { PASSING_PCT, ratingTone, type Tone } from '@/lib/rating';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { KIND_LABEL, type Paper } from '@/lib/types';
import { enter, SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';
import { cn, greeting } from '@/lib/utils';

const TONE_COLOR: Record<Tone, string> = {
  success: colors.success,
  info: colors.info,
  warning: colors.warning,
  destructive: colors.primary,
};

const TONE_CLASS: Record<Tone, { bg: string; text: string }> = {
  success: { bg: 'bg-success/10', text: 'text-success' },
  info: { bg: 'bg-accent', text: 'text-accent-foreground' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  destructive: { bg: 'bg-secondary', text: 'text-primary' },
};

export default function Home() {
  const { teacher, papers, items, storage } = useStore();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const stats = useMemo(() => {
    const real = papers.filter((p) => p.readable);
    if (!real.length) return null;
    const avg = Math.round(real.reduce((s, p) => s + p.pct, 0) / real.length);
    const passing = real.filter((p) => p.pct >= PASSING_PCT).length;
    return { count: papers.length, avg, passing, of: real.length };
  }, [papers]);

  const name = teacher?.teacherName ?? '';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 48 + tabBarHeight, paddingHorizontal: 20 }}
      scrollIndicatorInsets={{ bottom: tabBarHeight }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full max-w-[680px] self-center">
        {/* Large-title header */}
        <Animated.View entering={enter(0)} className="flex-row items-start gap-4">
          <View className="flex-1 gap-1">
            <LiveClock />
            <Text role="heading" className="text-[34px] font-bold leading-[40px] tracking-[-0.8px]">
              {greeting()},{'\n'}
              {name}
            </Text>
          </View>
          <Pressable
            role="button"
            accessibilityLabel="Profile and settings"
            hitSlop={8}
            onPress={() => router.push('/settings')}
            className="mt-6 active:opacity-60"
          >
            <Avatar name={name} photo={teacher?.photo} />
          </Pressable>
        </Animated.View>

        {storage === 'error' ? (
          <Animated.View entering={enter(1)} className="mt-5">
            <View
              className="flex-row items-start gap-3 bg-warning/10 px-4 py-3"
              style={[SMOOTH, { borderRadius: 14 }]}
              role="alert"
            >
              <TriangleAlert size={18} color={colors.warning} style={{ marginTop: 1 }} />
              <Text variant="footnote" className="flex-1 text-warning">
                Not saving right now. Your results are kept until you close the app.
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Next step in the flow */}
        <Animated.View entering={enter(1)} className="mt-6">
          <CheckHero />
        </Animated.View>

        {stats ? (
          <Animated.View entering={enter(2)} className="mt-9">
            <SectionHeader title="Summary" />
            <Summary {...stats} />
          </Animated.View>
        ) : null}

        {papers.length ? (
          <Animated.View entering={enter(3)} className="mt-9">
            <SectionHeader title="Recently checked" action={<SectionAction label="See All" href="/papers" />} />
            <InsetGroup>
              {papers.slice(0, 3).map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <InsetDivider inset={72} /> : null}
                  <RecentRow paper={p} />
                </View>
              ))}
            </InsetGroup>
          </Animated.View>
        ) : null}

        <Animated.View entering={enter(4)} className="mt-9">
          <InsetGroup>
            <NavRow
              icon={ClipboardList}
              tint="#E8892B"
              label="My Items"
              value={items.length ? String(items.length) : undefined}
              href="/items"
            />
            <InsetDivider inset={60} />
            <NavRow
              icon={FileText}
              tint={colors.success}
              label="My Papers"
              value={papers.length ? String(papers.length) : undefined}
              href="/papers"
            />
            <InsetDivider inset={60} />
            <NavRow icon={CircleHelp} tint={colors.info} label="How to use SOL" href="/help" />
          </InsetGroup>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

/** The featured card: what to check next, with the big red camera button. */
function CheckHero() {
  const { activeItem, items } = useStore();

  if (!activeItem) {
    return (
      <View className="gap-4 bg-card p-5" style={[SMOOTH, { borderRadius: 22, boxShadow: SHADOW_MD }]}>
        <IconTile icon={ClipboardList} tint={colors.primary} size={44} />
        <View className="gap-1.5">
          <Text className="text-[22px] font-bold leading-7 tracking-[-0.4px]">Set up what to check</Text>
          <Text className="text-[15px] leading-5 text-muted-foreground">
            Add the question and the rubric SOL will check against.
          </Text>
        </View>
        <View className="gap-2.5">
          <HeroButton
            label="Set up an item"
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: 'new' } })}
          />
          {items.length ? (
            <HeroButton label="Pick a saved item" variant="tinted" onPress={() => router.navigate('/items')} />
          ) : null}
        </View>
      </View>
    );
  }

  const points = activeItem.rubric.reduce((s, r) => s + r.pts, 0);
  return (
    <View className="gap-4 bg-card p-5" style={[SMOOTH, { borderRadius: 22, boxShadow: SHADOW_MD }]}>
      <View className="flex-row items-center gap-3">
        <IconTile icon={activeItem.kind === 'math' ? Calculator : PenLine} tint={colors.primary} size={44} />
        <View className="flex-1">
          <Text className="text-[13px] font-semibold uppercase tracking-[0.4px] text-primary">Ready to check</Text>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {KIND_LABEL[activeItem.kind]} · {points} points{activeItem.grade ? ` · ${activeItem.grade}` : ''}
          </Text>
        </View>
      </View>
      <Text className="text-[22px] font-bold leading-7 tracking-[-0.4px]" numberOfLines={3}>
        {activeItem.title}
      </Text>
      <View className="gap-2.5">
        <HeroButton
          icon
          label={activeItem.kind === 'math' ? 'Check a Solution' : 'Check an Essay'}
          onPress={() => router.navigate('/check')}
        />
        <Pressable
          role="button"
          onPress={() => router.navigate('/items')}
          hitSlop={6}
          className="h-10 items-center justify-center active:opacity-50"
        >
          <Text className="text-[15px] text-info">Change item</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HeroButton({
  label,
  onPress,
  icon,
  variant = 'filled',
}: {
  label: string;
  onPress: () => void;
  icon?: boolean;
  variant?: 'filled' | 'tinted';
}) {
  const filled = variant === 'filled';
  return (
    <PressableScale
      role="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.98}
      className={cn('h-[52px] flex-row items-center justify-center gap-2', filled ? 'bg-primary' : 'bg-primary/10')}
      style={[SMOOTH, { borderRadius: 14 }]}
    >
      {icon ? <Camera size={19} color="#fff" strokeWidth={2.2} /> : null}
      <Text className={cn('text-[17px] font-semibold tracking-[-0.2px]', filled ? 'text-white' : 'text-primary')}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Activity-style summary: an average ring beside two headline numbers. */
function Summary({ count, avg, passing, of }: { count: number; avg: number; passing: number; of: number }) {
  return (
    <InsetGroup className="flex-row items-center gap-5 p-5">
      <Ring pct={avg} color={TONE_COLOR[ratingTone(avg)]} />
      <View className="flex-1">
        <Metric value={String(count)} label={count === 1 ? 'Paper checked' : 'Papers checked'} />
        <View className="my-3 h-px bg-border" />
        <Metric value={`${passing}`} suffix={` of ${of}`} label={`Passing (${PASSING_PCT}%+)`} />
      </View>
    </InsetGroup>
  );
}

function Metric({ value, suffix, label }: { value: string; suffix?: string; label: string }) {
  return (
    <View>
      <Text className="text-[28px] font-bold leading-8 tracking-[-0.5px]" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
        {suffix ? <Text className="text-[17px] font-semibold text-muted-foreground">{suffix}</Text> : null}
      </Text>
      <Text variant="footnote" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Progress ring that sweeps in from zero. */
function Ring({ pct, color, size = 104, stroke = 11 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(Math.min(pct, 100) / 100, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.get()) }));

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessible
      accessibilityLabel={`Average score ${pct} percent`}
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.muted} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      <Text className="text-[24px] font-bold leading-7 tracking-[-0.5px]" style={{ fontVariant: ['tabular-nums'] }}>
        {pct}%
      </Text>
      <Text className="text-[11px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">Average</Text>
    </View>
  );
}

function RecentRow({ paper }: { paper: Paper }) {
  const tone = TONE_CLASS[ratingTone(paper.pct)];
  const date = new Date(paper.checkedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const tags = paper.edited ? 'Edited' : '';
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${paper.learner}, ${paper.total} out of ${paper.max}, ${paper.pct} percent. View`}
      onPress={() => router.push({ pathname: '/paper/[id]', params: { id: paper.id } })}
      className="flex-row items-center gap-3 px-4 py-3 active:bg-muted"
    >
      <View className={cn('h-11 w-11 items-center justify-center rounded-full', tone.bg)}>
        <Text className={cn('text-[13px] font-bold', tone.text)} style={{ fontVariant: ['tabular-nums'] }}>
          {paper.pct}%
        </Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[17px] font-semibold" numberOfLines={1}>
          {paper.learner}
        </Text>
        <Text variant="footnote" tone="muted" numberOfLines={1}>
          {[paper.section, paper.itemTitle, tags].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="text-[15px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {paper.total}/{paper.max}
        </Text>
        <Text variant="caption" tone="muted">
          {date}
        </Text>
      </View>
      <ChevronRight size={18} strokeWidth={2.25} color={colors.placeholder} />
    </Pressable>
  );
}
