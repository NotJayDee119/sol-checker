import { Stack, useLocalSearchParams } from 'expo-router';
import { FolderOpen } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PaperRow } from '@/components/paper-row';
import { Screen, SectionLabel } from '@/components/screen';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { groupIntoFolders } from '@/lib/folders';
import { PASSING_PCT } from '@/lib/rating';
import { useStore } from '@/lib/store';
import type { Paper } from '@/lib/types';

/** One grade folder: its papers, grouped by section, newest first. */
export default function FolderScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { papers, items } = useStore();
  const folder = useMemo(
    () => groupIntoFolders(papers, items).find((f) => f.name === name) ?? null,
    [papers, items, name]
  );
  const sections = useMemo(() => (folder ? bySection(folder.papers) : []), [folder]);

  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Folder' }} />
      <Screen topInset={false}>
        {!folder ? (
          <EmptyState
            icon={FolderOpen}
            title="This folder is empty"
            description="Its papers were deleted or moved to another grade."
          />
        ) : (
          <>
            <View className="flex-row gap-2">
              <Stat label="Papers" value={String(folder.papers.length)} />
              <Stat label="Average" value={`${folder.avg}%`} />
              <Stat
                label={`At ${PASSING_PCT}%+`}
                value={String(folder.papers.filter((p) => p.pct >= PASSING_PCT).length)}
              />
            </View>

            {sections.map(([section, list]) => (
              <View key={section} className="gap-2">
                {sections.length > 1 ? (
                  <SectionLabel>
                    {section} · {list.length}
                  </SectionLabel>
                ) : null}
                {list.map((p) => (
                  <PaperRow key={p.id} paper={p} />
                ))}
              </View>
            ))}
          </>
        )}
      </Screen>
    </>
  );
}

const NO_SECTION = 'No section';

function bySection(list: Paper[]) {
  const map = new Map<string, Paper[]>();
  for (const p of list) {
    const key = p.section.trim() || NO_SECTION;
    map.set(key, [...(map.get(key) ?? []), p]);
  }
  return [...map].sort(([a], [b]) =>
    a === NO_SECTION ? 1 : b === NO_SECTION ? -1 : a.localeCompare(b, undefined, { numeric: true })
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 gap-0.5 p-3">
      <Text className="font-mono-bold text-lg">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Card>
  );
}
