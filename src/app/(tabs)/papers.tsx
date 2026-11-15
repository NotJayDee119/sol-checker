import { router } from 'expo-router';
import { ChevronRight, CircleAlert, CircleCheck, Download, FileText, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { GroupFootnote, GroupHeader, IconTile, InsetDivider, InsetGroup } from '@/components/inset-group';
import { ScoreRing, TONE_COLOR } from '@/components/score-ring';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { exportCsv } from '@/lib/csv';
import { PASSING_PCT, ratingTone, type Tone } from '@/lib/rating';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import type { Paper } from '@/lib/types';
import { enter, reflow, SHADOW_MD, SMOOTH } from '@/lib/ui-tokens';
import { cn } from '@/lib/utils';

const ALL = '__all__';

const TONES: { tone: Tone; label: string }[] = [
  { tone: 'success', label: '85+' },
  { tone: 'info', label: '75–84' },
  { tone: 'warning', label: '60–74' },
  { tone: 'destructive', label: 'Below 60' },
];

/** Records panel, "My checked papers" (spec §4.5). */
export default function Papers() {
  const { papers, deletePaper } = useStore();
  const [itemFilter, setItemFilter] = useState(ALL);
  const [sectionFilter, setSectionFilter] = useState(ALL);
  const [query, setQuery] = useState('');
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const itemOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of papers) {
      const key = p.itemId || p.itemTitle;
      if (!seen.has(key)) seen.set(key, `${p.itemTitle}${p.kind === 'math' ? ' (Math)' : ''}`);
    }
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [papers]);

  const sectionOptions = useMemo(
    () =>
      [...new Set(papers.map((p) => p.section).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .map((s) => ({ value: s, label: s })),
    [papers]
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return papers.filter(
      (p) =>
        (itemFilter === ALL || (p.itemId || p.itemTitle) === itemFilter) &&
        (sectionFilter === ALL || p.section === sectionFilter) &&
        (!q || p.learner.toLowerCase().includes(q))
    );
  }, [papers, itemFilter, sectionFilter, query]);

  const summary = useMemo(() => summarize(shown), [shown]);
  const sameRubric = useMemo(() => shareRubric(shown), [shown]);
  const groups = useMemo(() => groupByDay(shown), [shown]);
  const filtered = itemFilter !== ALL || sectionFilter !== ALL || query.trim() !== '';

  async function download() {
    if (exporting || !shown.length) return;
    setExporting(true);
    setExportMsg(null);
    try {
      await exportCsv(shown);
      setExportMsg({ ok: true, text: `CSV ready with ${shown.length} paper${shown.length === 1 ? '' : 's'}.` });
    } catch (e) {
      setExportMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't create the CSV." });
    } finally {
      setExporting(false);
    }
  }

  function confirmDelete(p: Paper) {
    const title = `Delete ${p.learner}'s paper?`;
    const message = 'This removes the result from this phone. It can’t be undone.';
    if (Platform.OS === 'web') {
      // Alert.alert has no buttons on web.
      if (window.confirm(`${title}\n\n${message}`)) deletePaper(p.id);
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message, options: ['Delete Paper', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (i) => i === 0 && deletePaper(p.id)
      );
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePaper(p.id) },
    ]);
  }

  return (
    <Screen className="gap-0 px-5">
      {/* Large-title header with export */}
      <Animated.View entering={enter(0)} className="flex-row items-end gap-3 pt-2">
        <View className="flex-1">
          <Text role="heading" className="text-[34px] font-bold leading-[40px] tracking-[-0.8px]">
            My Papers
          </Text>
          <Text className="mt-1 text-[15px] leading-5 text-muted-foreground">
            Newest first. Private to you on this phone.
          </Text>
        </View>
        {papers.length ? (
          <Pressable
            role="button"
            accessibilityLabel={filtered ? `Download CSV of ${shown.length} shown papers` : 'Download CSV'}
            onPress={download}
            disabled={!shown.length || exporting}
            hitSlop={6}
            className="mb-1 h-9 flex-row items-center gap-1.5 bg-info/10 px-3.5 active:opacity-60"
            style={[SMOOTH, { borderRadius: 18, opacity: shown.length ? 1 : 0.4 }]}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Download size={16} strokeWidth={2.3} color={colors.info} />
            )}
            <Text className="text-[15px] font-semibold text-info">CSV</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {exportMsg ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="mt-3 flex-row items-center gap-2 px-1"
          role="status"
        >
          {exportMsg.ok ? (
            <CircleCheck size={15} color={colors.success} />
          ) : (
            <CircleAlert size={15} color={colors.destructive} />
          )}
          <Text variant="footnote" tone={exportMsg.ok ? 'success' : 'destructive'} className="flex-1">
            {exportMsg.text}
          </Text>
        </Animated.View>
      ) : null}

      {papers.length === 0 ? (
        <Animated.View entering={enter(1)} className="mt-16 items-center px-6">
          <IconTile icon={FileText} tint={colors.mutedForeground} size={64} />
          <Text className="mt-5 text-center text-[22px] font-bold leading-7 tracking-[-0.4px]">No papers yet</Text>
          <Text className="mt-2 max-w-[300px] text-center text-[15px] leading-5 text-muted-foreground">
            Check a paper and it&apos;s saved here automatically. Then download the CSV for your class record.
          </Text>
        </Animated.View>
      ) : (
        <>
          {/* Summary */}
          {summary ? (
            <Animated.View entering={enter(1)} layout={reflow} className="mt-6">
              <SummaryCard {...summary} filtered={filtered} />
            </Animated.View>
          ) : null}

          {/* Search + filters */}
          <Animated.View entering={enter(2)} layout={reflow} className="mt-7 gap-3">
            <SearchField value={query} onChange={setQuery} />
            {itemOptions.length > 1 ? (
              <FilterChips label="Item" value={itemFilter} onChange={setItemFilter} options={itemOptions} />
            ) : null}
            {sectionOptions.length > 1 ? (
              <FilterChips label="Section" value={sectionFilter} onChange={setSectionFilter} options={sectionOptions} />
            ) : null}
          </Animated.View>

          {/* Papers, grouped by day */}
          {shown.length === 0 ? (
            <Animated.View entering={FadeIn.duration(200)} className="items-center py-12">
              <Search size={28} color={colors.placeholder} />
              <Text className="mt-3 text-[17px] font-semibold">No matches</Text>
              <Text className="mt-1 text-[15px] text-muted-foreground">Try another name or filter.</Text>
            </Animated.View>
          ) : (
            <Animated.View entering={enter(3)} layout={reflow}>
              {groups.map((g) => (
                <View key={g.key} className="mt-7">
                  <GroupHeader>{g.label}</GroupHeader>
                  <InsetGroup>
                    {g.papers.map((p, i) => (
                      <View key={p.id}>
                        {i > 0 ? <InsetDivider inset={74} /> : null}
                        <PaperListRow paper={p} showCriteria={sameRubric} onDelete={() => confirmDelete(p)} />
                      </View>
                    ))}
                  </InsetGroup>
                </View>
              ))}
              <GroupFootnote>Touch and hold a paper to delete it.</GroupFootnote>
            </Animated.View>
          )}
        </>
      )}
    </Screen>
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────

type Summary = NonNullable<ReturnType<typeof summarize>>;

function summarize(rows: Paper[]) {
  if (!rows.length) return null;
  const pcts = rows.map((p) => p.pct);
  const tones: Record<Tone, number> = { success: 0, info: 0, warning: 0, destructive: 0 };
  for (const p of pcts) tones[ratingTone(p)] += 1;
  return {
    count: rows.length,
    avg: Math.round(pcts.reduce((a, b) => a + b, 0) / rows.length),
    high: Math.max(...pcts),
    low: Math.min(...pcts),
    passing: pcts.filter((p) => p >= PASSING_PCT).length,
    tones,
  };
}

/** Health-style summary: big average, a stacked bar of how scores spread, and key numbers. */
function SummaryCard({ count, avg, high, low, passing, tones, filtered }: Summary & { filtered: boolean }) {
  return (
    <View className="bg-card p-5" style={[SMOOTH, { borderRadius: 22, boxShadow: SHADOW_MD }]}>
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-[13px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
            {filtered ? 'Average · Shown' : 'Class average'}
          </Text>
          <Text
            className="text-[40px] font-bold leading-[46px] tracking-[-1px]"
            style={{ color: TONE_COLOR[ratingTone(avg)], fontVariant: ['tabular-nums'] }}
          >
            {avg}
            <Text className="text-[22px] font-bold" style={{ color: TONE_COLOR[ratingTone(avg)] }}>
              %
            </Text>
          </Text>
        </View>
        <View className="items-end pb-1.5">
          <Text className="text-[22px] font-bold leading-7 tracking-[-0.4px]" style={{ fontVariant: ['tabular-nums'] }}>
            {passing}
            <Text className="text-[15px] font-semibold text-muted-foreground"> of {count}</Text>
          </Text>
          <Text variant="caption" tone="muted">
            At {PASSING_PCT}% or above
          </Text>
        </View>
      </View>

      {/* Distribution bar */}
      <View
        className="mt-4 h-2.5 flex-row gap-[3px] overflow-hidden"
        style={{ borderRadius: 5 }}
        accessible
        accessibilityLabel={TONES.map((t) => `${tones[t.tone]} scored ${t.label}`).join(', ')}
      >
        {TONES.filter((t) => tones[t.tone] > 0).map((t) => (
          <View key={t.tone} style={{ flex: tones[t.tone], backgroundColor: TONE_COLOR[t.tone], borderRadius: 2 }} />
        ))}
      </View>
      <View className="mt-2.5 flex-row flex-wrap gap-x-4 gap-y-1">
        {TONES.map((t) => (
          <View key={t.tone} className="flex-row items-center gap-1.5">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: TONE_COLOR[t.tone] }} />
            <Text variant="caption" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {t.label} · {tones[t.tone]}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row bg-background py-3" style={[SMOOTH, { borderRadius: 14 }]}>
        <MiniStat value={String(count)} label={count === 1 ? 'Paper' : 'Papers'} />
        <View className="w-px bg-border" />
        <MiniStat value={`${high}%`} label="Highest" />
        <View className="w-px bg-border" />
        <MiniStat value={`${low}%`} label="Lowest" />
      </View>
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[18px] font-bold leading-6 tracking-[-0.3px]" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

// ── List ──────────────────────────────────────────────────────────────────────

/** Per-criterion scores only when every shown row shares the same rubric (spec §4.5). */
function shareRubric(rows: Paper[]) {
  if (rows.length < 1) return false;
  const sig = (p: Paper) => p.criteria.map((c) => `${c.name}:${c.max}`).join('|');
  const first = sig(rows[0]);
  return rows.every((p) => sig(p) === first);
}

function dayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(ms: number) {
  const now = new Date();
  const today = dayKey(now.getTime());
  const yesterday = dayKey(now.getTime() - 86_400_000);
  const key = dayKey(ms);
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/** Keeps the incoming (newest-first) order; starts a new group whenever the day changes. */
function groupByDay(rows: Paper[]) {
  const groups: { key: string; label: string; papers: Paper[] }[] = [];
  for (const p of rows) {
    const key = dayKey(p.checkedAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.papers.push(p);
    else groups.push({ key, label: dayLabel(p.checkedAt), papers: [p] });
  }
  return groups;
}

function PaperListRow({
  paper,
  showCriteria,
  onDelete,
}: {
  paper: Paper;
  showCriteria: boolean;
  onDelete: () => void;
}) {
  const time = new Date(paper.checkedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${paper.learner}, ${paper.total} out of ${paper.max}, ${paper.pct} percent. View`}
      accessibilityHint="Touch and hold to delete"
      accessibilityActions={[{ name: 'delete', label: 'Delete paper' }]}
      onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && onDelete()}
      onPress={() => router.push({ pathname: '/paper/[id]', params: { id: paper.id } })}
      onLongPress={onDelete}
      delayLongPress={450}
      className="flex-row items-center gap-3 py-3 pl-4 pr-3 active:bg-muted"
    >
      <ScoreRing pct={paper.pct} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="shrink text-[17px] font-semibold" numberOfLines={1}>
            {paper.learner}
          </Text>
          {paper.edited ? <Tag label="Edited" className="bg-accent text-accent-foreground" /> : null}
        </View>
        <Text variant="footnote" tone="muted" numberOfLines={1}>
          {[paper.section, `${paper.itemTitle}${paper.kind === 'math' ? ' (Math)' : ''}`].filter(Boolean).join(' · ')}
        </Text>
        {showCriteria && paper.criteria.length ? (
          <Text className="font-mono text-[12px] text-muted-foreground" numberOfLines={1}>
            {paper.criteria.map((c) => `${c.score}/${c.max}`).join('  ')}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-0.5">
        <Text className="text-[15px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
          {paper.total}/{paper.max}
        </Text>
        <Text variant="caption" tone="muted">
          {time}
        </Text>
      </View>
      <ChevronRight size={18} strokeWidth={2.25} color={colors.placeholder} />
    </Pressable>
  );
}

function Tag({ label, className }: { label: string; className: string }) {
  const [bg, text] = className.split(' ');
  return (
    <View className={cn('rounded-full px-1.5 py-px', bg)}>
      <Text className={cn('text-[10px] font-semibold uppercase tracking-[0.3px]', text)}>{label}</Text>
    </View>
  );
}

// ── Search & filters ─────────────────────────────────────────────────────────

/** iOS-style search field with a clear button. */
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View className="h-10 flex-row items-center gap-2 bg-muted px-3" style={[SMOOTH, { borderRadius: 12 }]}>
      <Search size={16} color={colors.mutedForeground} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search learner"
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.info}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search learner"
        className="flex-1 web:outline-none"
        style={{ fontSize: 16, color: colors.foreground, paddingVertical: 0, includeFontPadding: false }}
      />
      {value ? (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)}>
          <Pressable
            role="button"
            accessibilityLabel="Clear search"
            onPress={() => onChange('')}
            hitSlop={8}
            className="h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/60"
          >
            <X size={12} color="#fff" strokeWidth={3} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Horizontal capsule filters; the selected one fills dark, like iOS filter pills. */
function FilterChips({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const all = [{ value: ALL, label: `All ${label === 'Item' ? 'items' : 'sections'}` }, ...options];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      role="radiogroup"
      accessibilityLabel={label}
    >
      {all.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            role="radio"
            aria-checked={selected}
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${label}: ${o.label}`}
            onPress={() => onChange(o.value)}
            className={cn(
              'h-9 justify-center px-4',
              selected ? 'bg-foreground' : 'border border-border bg-card active:bg-muted'
            )}
            style={[SMOOTH, { borderRadius: 18 }]}
          >
            <Text
              numberOfLines={1}
              className={cn('text-[15px]', selected ? 'font-semibold text-white' : 'text-foreground')}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
