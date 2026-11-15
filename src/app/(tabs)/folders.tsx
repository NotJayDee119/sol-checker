import { router } from 'expo-router';
import { Folder as FolderIcon, FolderOpen } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PressableScale } from '@/components/pressable-scale';
import { Screen, ScreenTitle } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { groupIntoFolders, NO_GRADE, type Folder } from '@/lib/folders';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';

/** Checked papers filed automatically into one folder per grade (from the item's Grade field). */
export default function Folders() {
  const { papers, items } = useStore();
  const folders = useMemo(() => groupIntoFolders(papers, items), [papers, items]);

  return (
    <Screen>
      <ScreenTitle title="Folders" subtitle="Every checked paper is filed by grade automatically." />

      {folders.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No folders yet"
          description="Check a paper and it goes into a folder named after the item's grade, like Grade 8."
        />
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {folders.map((f) => (
            <FolderCard key={f.name} folder={f} />
          ))}
        </View>
      )}

      {folders.some((f) => f.name === NO_GRADE) ? (
        <Text variant="footnote" tone="muted" className="px-1">
          Papers in “{NO_GRADE}” came from items without a grade. Add one in My Items so new papers are filed.
        </Text>
      ) : null}
    </Screen>
  );
}

function FolderCard({ folder }: { folder: Folder }) {
  const count = folder.papers.length;
  const noGrade = folder.name === NO_GRADE;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/folder/[name]', params: { name: folder.name } })}
      accessibilityRole="button"
      accessibilityLabel={`${folder.name}, ${count} paper${count === 1 ? '' : 's'}, average ${folder.avg} percent. Open`}
      className="min-w-[46%] flex-1 gap-3 rounded-lg border border-border bg-card p-4"
    >
      <View className={noGrade ? 'h-11 w-11 items-center justify-center rounded-xl bg-muted' : 'h-11 w-11 items-center justify-center rounded-xl bg-accent'}>
        <Icon as={FolderIcon} size={22} className={noGrade ? 'text-muted-foreground' : 'text-info'} />
      </View>
      <View className="gap-0.5">
        <Text variant="headline" numberOfLines={1}>
          {folder.name}
        </Text>
        <Text variant="footnote" tone="muted">
          {count} paper{count === 1 ? '' : 's'} · avg <Text className="font-mono text-[13px] text-foreground">{folder.avg}%</Text>
        </Text>
        <Text variant="caption" tone="muted">
          Last: {formatDate(folder.lastCheckedAt)}
        </Text>
      </View>
    </PressableScale>
  );
}
