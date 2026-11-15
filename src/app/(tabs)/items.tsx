import { router } from 'expo-router';
import { Calculator, Camera, ChevronRight, ClipboardList, PenLine, Pencil, Plus, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { IconTile, InsetDivider, InsetGroup, SectionHeader } from '@/components/inset-group';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Text } from '@/components/ui/text';
import { useStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { KIND_LABEL, rubricTotal, type Item, type ItemKind, type Paper } from '@/lib/types';
import { enter, reflow, SHADOW_MD, SHADOW_SM, SMOOTH } from '@/lib/ui-tokens';
import { cn, formatDate } from '@/lib/utils';

type Filter = 'all' | ItemKind;

const KIND_TINT: Record<ItemKind, string> = { essay: colors.primary, math: colors.info };
const KIND_ICON = { essay: PenLine, math: Calculator } as const;

/** Search and filter appear once the list is long enough to need them. */
const TOOLS_FROM = 4;

/** "My saved items": pick one to check papers with, or set up a new one (flow steps D–I). */
export default function Items() {
  const { items, activeItemId, setActiveItem, papers } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const newItem = (kind: ItemKind) => router.push({ pathname: '/item/[id]', params: { id: 'new', kind } });
  const edit = (id: string) => router.push({ pathname: '/item/[id]', params: { id } });
  const use = (id: string) => {
    setActiveItem(id);
    router.navigate('/check');
  };

  const active = items.find((i) => i.id === activeItemId) ?? null;
  const stats = useMemo(() => statsByItem(papers), [papers]);

  const rest = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.id !== activeItemId &&
        (filter === 'all' || i.kind === filter) &&
        (!q || i.title.toLowerCase().includes(q) || i.grade.toLowerCase().includes(q))
    );
  }, [items, activeItemId, filter, query]);

  const showTools = items.length >= TOOLS_FROM;
  const searching = !!query.trim() || filter !== 'all';

  return (
    <Screen className="gap-0 px-5">
      {/* Large-title header */}
      <Animated.View entering={enter(0)} className="pt-2">
        <Text role="heading" className="text-[34px] font-bold leading-[40px] tracking-[-0.8px]">
          My Items
        </Text>
        <Text className="mt-1 text-[15px] leading-5 text-muted-foreground">
          Saved questions and rubrics. Reuse one for the whole class.
        </Text>
      </Animated.View>

      {/* New item tiles */}
      <Animated.View entering={enter(1)} className="mt-6 flex-row gap-3">
        <NewTile kind="essay" label="New Essay" hint="Written answers" onPress={() => newItem('essay')} />
        <NewTile kind="math" label="New Math" hint="Show-your-solution" onPress={() => newItem('math')} />
      </Animated.View>

      {items.length === 0 ? (
        <Animated.View entering={enter(2)} className="mt-14 items-center px-6">
          <IconTile icon={ClipboardList} tint={colors.mutedForeground} size={64} />
          <Text className="mt-5 text-center text-[22px] font-bold leading-7 tracking-[-0.4px]">No items yet</Text>
          <Text className="mt-2 max-w-[300px] text-center text-[15px] leading-5 text-muted-foreground">
            Set up an essay question or math problem with its rubric, then check every paper in your class with it.
          </Text>
        </Animated.View>
      ) : null}

      {/* The item in use */}
      {active ? (
        <Animated.View entering={enter(2)} className="mt-9">
          <SectionHeader title="In Use" />
          <ActiveCard
            item={active}
            stats={stats[active.id]}
            onCheck={() => use(active.id)}
            onEdit={() => edit(active.id)}
          />
        </Animated.View>
      ) : null}

      {/* Everything else */}
      {items.length > (active ? 1 : 0) ? (
        <Animated.View entering={enter(3)} layout={reflow} className="mt-9">
          <SectionHeader
            title={active ? 'Other Items' : 'All Items'}
            action={
              <Text className="text-[15px] text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
                {items.length}
              </Text>
            }
          />

          {showTools ? (
            <View className="mb-3 gap-2.5">
              <SearchField value={query} onChange={setQuery} />
              <SegmentedControl
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'essay', label: 'Essay' },
                  { value: 'math', label: 'Math' },
                ]}
              />
            </View>
          ) : null}

          {rest.length ? (
            <InsetGroup>
              {rest.map((item, i) => (
                <View key={item.id}>
                  {i > 0 ? <InsetDivider inset={66} /> : null}
                  <ItemRow item={item} stats={stats[item.id]} onUse={() => use(item.id)} onEdit={() => edit(item.id)} />
                </View>
              ))}
            </InsetGroup>
          ) : searching ? (
            <Animated.View entering={FadeIn.duration(200)} className="items-center py-10">
              <Search size={28} color={colors.placeholder} />
              <Text className="mt-3 text-[17px] font-semibold">No matches</Text>
              <Text className="mt-1 text-[15px] text-muted-foreground">Try another title or grade.</Text>
            </Animated.View>
          ) : null}

          {rest.length ? (
            <Text variant="footnote" tone="muted" className="mt-2 px-4">
              Tap an item to check papers with it.
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </Screen>
  );
}

type ItemStats = { checked: number; avg: number | null };

function statsByItem(papers: Paper[]): Record<string, ItemStats> {
  const acc: Record<string, { checked: number; sum: number; readable: number }> = {};
  for (const p of papers) {
    const s = (acc[p.itemId] ??= { checked: 0, sum: 0, readable: 0 });
    s.checked += 1;
    if (p.readable) {
      s.sum += p.pct;
      s.readable += 1;
    }
  }
  return Object.fromEntries(
    Object.entries(acc).map(([id, s]) => [
      id,
      { checked: s.checked, avg: s.readable ? Math.round(s.sum / s.readable) : null },
    ])
  );
}

function metaOf(item: Item) {
  return [KIND_LABEL[item.kind], `${rubricTotal(item.rubric)} pts`, item.grade].filter(Boolean).join(' · ');
}

/** Big squircle "new item" button, like a widget tile. */
function NewTile({ kind, label, hint, onPress }: { kind: ItemKind; label: string; hint: string; onPress: () => void }) {
  return (
    <PressableScale
      role="button"
      accessibilityLabel={label}
      onPress={onPress}
      scaleTo={0.97}
      className="flex-1 gap-3 border border-border bg-card p-4"
      style={[SMOOTH, { borderRadius: 18, boxShadow: SHADOW_SM }]}
    >
      <View className="flex-row items-center justify-between">
        <IconTile icon={KIND_ICON[kind]} tint={KIND_TINT[kind]} size={36} />
        <View className="h-7 w-7 items-center justify-center rounded-full bg-muted">
          <Plus size={16} strokeWidth={2.5} color={colors.foreground} />
        </View>
      </View>
      <View>
        <Text className="text-[17px] font-semibold tracking-[-0.2px]">{label}</Text>
        <Text variant="footnote" tone="muted" numberOfLines={1}>
          {hint}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Featured card for the item papers are being checked with. */
function ActiveCard({
  item,
  stats,
  onCheck,
  onEdit,
}: {
  item: Item;
  stats?: ItemStats;
  onCheck: () => void;
  onEdit: () => void;
}) {
  return (
    <View className="gap-4 bg-card p-5" style={[SMOOTH, { borderRadius: 22, boxShadow: SHADOW_MD }]}>
      <View className="flex-row items-start gap-3">
        <IconTile icon={KIND_ICON[item.kind]} tint={KIND_TINT[item.kind]} size={44} />
        <View className="flex-1">
          <Text className="text-[20px] font-bold leading-[26px] tracking-[-0.4px]" numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {metaOf(item)}
          </Text>
        </View>
      </View>

      {item.q ? (
        <Text className="text-[15px] leading-[21px] text-muted-foreground" numberOfLines={3}>
          {item.q}
        </Text>
      ) : null}

      <View className="flex-row bg-background py-3" style={[SMOOTH, { borderRadius: 14 }]}>
        <Stat value={String(stats?.checked ?? 0)} label="Checked" />
        <View className="w-px bg-border" />
        <Stat value={stats?.avg != null ? `${stats.avg}%` : '—'} label="Average" />
        <View className="w-px bg-border" />
        <Stat value={String(item.rubric.length)} label="Criteria" />
      </View>

      <View className="flex-row gap-2.5">
        <PressableScale
          role="button"
          accessibilityLabel="Check papers with this item"
          onPress={onCheck}
          scaleTo={0.98}
          className="h-[50px] flex-1 flex-row items-center justify-center gap-2 bg-primary"
          style={[SMOOTH, { borderRadius: 14 }]}
        >
          <Camera size={18} color="#fff" strokeWidth={2.2} />
          <Text className="text-[17px] font-semibold tracking-[-0.2px] text-white">Check Papers</Text>
        </PressableScale>
        <PressableScale
          role="button"
          accessibilityLabel="Edit this item"
          onPress={onEdit}
          scaleTo={0.96}
          className="h-[50px] flex-row items-center justify-center gap-1.5 bg-info/10 px-5"
          style={[SMOOTH, { borderRadius: 14 }]}
        >
          <Pencil size={16} color={colors.info} strokeWidth={2.2} />
          <Text className="text-[17px] font-semibold text-info">Edit</Text>
        </PressableScale>
      </View>
      <Text variant="caption" tone="muted" className="-mt-1 text-center">
        Updated {formatDate(item.updatedAt)}
      </Text>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[20px] font-bold leading-6 tracking-[-0.3px]" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/** List row: tap to check papers with it; the pencil edits it. */
function ItemRow({
  item,
  stats,
  onUse,
  onEdit,
}: {
  item: Item;
  stats?: ItemStats;
  onUse: () => void;
  onEdit: () => void;
}) {
  const checked = stats?.checked ?? 0;
  return (
    <View className="flex-row items-center">
      <Pressable
        role="button"
        accessibilityLabel={`${item.title}, ${KIND_LABEL[item.kind]}, ${checked} checked. Use for checking`}
        onPress={onUse}
        className="flex-1 flex-row items-center gap-3.5 py-3 pl-4 pr-2 active:bg-muted"
      >
        <IconTile icon={KIND_ICON[item.kind]} tint={KIND_TINT[item.kind]} size={36} />
        <View className="flex-1 gap-0.5">
          <Text className="text-[17px] font-semibold" numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {metaOf(item)}
          </Text>
        </View>
        {checked ? (
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text className="text-[12px] font-semibold text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
              {checked} checked
            </Text>
          </View>
        ) : null}
        <ChevronRight size={18} strokeWidth={2.25} color={colors.placeholder} />
      </Pressable>
      <Pressable
        role="button"
        accessibilityLabel={`Edit ${item.title}`}
        onPress={onEdit}
        hitSlop={6}
        className="mr-2 h-10 w-10 items-center justify-center rounded-full active:bg-muted"
      >
        <Pencil size={17} color={colors.info} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

/** iOS-style search field with a clear button. */
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View className="h-10 flex-row items-center gap-2 bg-muted px-3" style={[SMOOTH, { borderRadius: 12 }]}>
      <Search size={16} color={colors.mutedForeground} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search items"
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.info}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search items"
        className={cn('flex-1 web:outline-none')}
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
