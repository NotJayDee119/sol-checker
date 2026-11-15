import Constants from 'expo-constants';
import {
  ClipboardList,
  Camera,
  Download,
  Eye,
  IdCard,
  Images,
  Lock,
  MessageSquareText,
  Scale,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GroupFootnote, GroupHeader, IconTile, InsetDivider, InsetGroup } from '@/components/inset-group';
import { Screen } from '@/components/screen';
import { StatusRows } from '@/components/status-group';
import { Text } from '@/components/ui/text';
import { MAX_PHOTOS } from '@/lib/images';
import { colors } from '@/lib/theme';
import { enter, SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';

const STEPS: { title: string; body: string; icon: LucideIcon; tint: string }[] = [
  {
    title: 'Set up the item',
    body: 'In My Items, pick a saved item or make a new Essay or Math item: the question, the rubric, and the key points or answer key. Press Save Item.',
    icon: ClipboardList,
    tint: '#E8892B',
  },
  {
    title: 'Type the learner and section',
    body: 'On Check, type the learner’s name and section. The section stays filled for the next paper.',
    icon: UserRound,
    tint: colors.info,
  },
  {
    title: 'Add photos (optional)',
    body: `Photograph every page of the answer, in order (up to ${MAX_PHOTOS}). They are saved with the score as proof.`,
    icon: Camera,
    tint: colors.primary,
  },
  {
    title: 'Score and give feedback',
    body: 'Read the paper and tap a score for each part of the rubric. Tap ready-made comments or type a note, then press Save score.',
    icon: MessageSquareText,
    tint: '#7A5AF8',
  },
  {
    title: 'Review, correct, download',
    body: 'Open a paper to see its photos. Tap Edit to fix a score or feedback, then Save corrections. In My Papers, download the CSV for your class record.',
    icon: Download,
    tint: colors.success,
  },
];

const SCALE: { range: string; label: string; color: string }[] = [
  { range: '90–100', label: 'Outstanding', color: colors.success },
  { range: '85–89', label: 'Very Satisfactory', color: colors.success },
  { range: '80–84', label: 'Satisfactory', color: colors.info },
  { range: '75–79', label: 'Fairly Satisfactory', color: colors.info },
  { range: 'Below 75', label: 'Did Not Meet Expectations', color: colors.primary },
];

const PRIVACY: { title: string; body: string; icon: LucideIcon; tint: string }[] = [
  {
    title: 'Private to you',
    body: 'Your checked papers are saved only on this phone and are private to you.',
    icon: Lock,
    tint: colors.success,
  },
  {
    title: 'Photos stay on this phone',
    body: 'Photos of papers are saved only on this phone, with the score. Deleting a paper deletes its photos.',
    icon: Images,
    tint: colors.info,
  },
  {
    title: 'Names and sections only',
    body: 'Do not record LRNs, addresses or other personal data (Data Privacy Act of 2012, RA 10173).',
    icon: IdCard,
    tint: '#E8892B',
  },
  {
    title: 'You decide every score',
    body: 'SOL only adds up the scores you give. Nothing is sent anywhere to be checked.',
    icon: Eye,
    tint: colors.primary,
  },
];

const TILE = 36;

export default function Help() {
  return (
    <Screen topInset={false} className="gap-0 px-5">
      {/* The one rule */}
      <Animated.View entering={enter(1)} className="mt-2">
        <View
          className="flex-row items-center gap-4 bg-foreground p-5"
          style={[SMOOTH, { borderRadius: 22, boxShadow: SHADOW_MD }]}
        >
          <View
            className="items-center justify-center bg-white/15"
            style={[SMOOTH, { width: 48, height: 48, borderRadius: 13 }]}
          >
            <Scale size={24} color="#fff" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-[19px] font-bold leading-6 tracking-[-0.3px] text-white">
              You score. SOL keeps the record.
            </Text>
            <Text className="mt-0.5 text-[14px] leading-[19px] text-white/70">
              Totals, percentages and ratings are worked out from your scores.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Steps as a timeline */}
      <Animated.View entering={enter(2)} className="mt-9">
        <GroupHeader>How it works</GroupHeader>
        <InsetGroup className="px-4 py-2">
          {STEPS.map((s, i) => {
            const last = i === STEPS.length - 1;
            return (
              <View key={s.title} className="flex-row gap-3.5">
                {/* Tile with a connector line down to the next step */}
                <View className="items-center pt-3">
                  <IconTile icon={s.icon} tint={s.tint} size={TILE} />
                  {last ? null : <View className="mt-1.5 w-[2px] flex-1 rounded-full bg-border" />}
                </View>
                <View className={last ? 'flex-1 py-3' : 'flex-1 pb-4 pt-3'}>
                  <Text className="text-[12px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
                    Step {i + 1}
                  </Text>
                  <Text className="text-[17px] font-semibold leading-[22px] tracking-[-0.2px]">{s.title}</Text>
                  <Text className="mt-1 text-[15px] leading-[21px] text-muted-foreground">{s.body}</Text>
                </View>
              </View>
            );
          })}
        </InsetGroup>
      </Animated.View>

      {/* Rating scale */}
      <Animated.View entering={enter(3)} className="mt-9">
        <GroupHeader>Rating scale</GroupHeader>
        <InsetGroup>
          {SCALE.map((r, i) => (
            <View key={r.range}>
              {i > 0 ? <InsetDivider /> : null}
              <View
                className="min-h-[50px] flex-row items-center gap-3 px-4"
                accessible
                accessibilityLabel={`${r.range} percent: ${r.label}`}
              >
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                <Text className="flex-1 text-[17px]">{r.label}</Text>
                <Text
                  className="text-[15px] font-semibold text-muted-foreground"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {r.range}
                </Text>
              </View>
            </View>
          ))}
        </InsetGroup>
        <GroupFootnote>Percent of the item&apos;s total points.</GroupFootnote>
      </Animated.View>

      {/* Privacy */}
      <Animated.View entering={enter(4)} className="mt-9">
        <GroupHeader>Privacy</GroupHeader>
        <InsetGroup>
          {PRIVACY.map((p, i) => (
            <View key={p.title}>
              {i > 0 ? <InsetDivider inset={66} /> : null}
              <View className="flex-row gap-3.5 px-4 py-3">
                <View className="pt-0.5">
                  <IconTile icon={p.icon} tint={p.tint} size={TILE} />
                </View>
                <View className="flex-1">
                  <Text className="text-[17px] font-semibold leading-[22px] tracking-[-0.2px]">{p.title}</Text>
                  <Text className="mt-0.5 text-[15px] leading-[21px] text-muted-foreground">{p.body}</Text>
                </View>
              </View>
            </View>
          ))}
        </InsetGroup>
      </Animated.View>

      {/* Status */}
      <Animated.View entering={enter(5)} className="mt-9">
        <GroupHeader>Status</GroupHeader>
        <InsetGroup>
          <StatusRows />
        </InsetGroup>
      </Animated.View>

      <Text variant="caption" className="mt-10 text-center text-muted-foreground/70">
        SOL {Constants.expoConfig?.version ?? ''} · Scan · Observe · Learn
      </Text>
    </Screen>
  );
}
