import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CircleCheck, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ResultView } from '@/components/result-view';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/** Result for one paper, with review and corrections (flow steps R–V). */
export default function PaperScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { papers, savePaper, storage, teacher } = useStore();
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const paper = papers.find((p) => p.id === id);

  if (!paper) {
    return (
      <Screen topInset={false}>
        <Text variant="headline">This paper was deleted.</Text>
        <Button variant="outline" onPress={() => router.back()}>
          <Text>Go back</Text>
        </Button>
      </Screen>
    );
  }

  const isFresh = fresh === '1' && !savedNote;
  const banner = savedNote
    ? { ok: storage !== 'error', text: storage === 'error' ? `Corrections kept until you close the app — download the CSV to keep them.` : savedNote }
    : isFresh
      ? storage === 'error'
        ? { ok: false, text: 'Scored, but not saved: storage is unavailable. Results are kept until you close the app — download the CSV.' }
        : { ok: true, text: 'Score saved.' }
      : null;

  return (
    <>
      <Stack.Screen options={{ title: 'Result' }} />
      <Screen topInset={false}>
        {banner ? (
          <View
            className={cn('flex-row items-center gap-2.5 rounded-lg p-3', banner.ok ? 'bg-success/10' : 'bg-warning/10')}
            role="status"
          >
            <Icon as={banner.ok ? CircleCheck : TriangleAlert} size={18} className={banner.ok ? 'text-success' : 'text-warning'} />
            <Text variant="subhead" className="flex-1">
              {banner.text}
            </Text>
          </View>
        ) : null}

        {isFresh ? (
          <Text variant="footnote" tone="muted">
            If a score is wrong, tap Edit, change it, then Save corrections.
          </Text>
        ) : null}

        <ResultView
          key={`${paper.id}-${paper.editedAt ?? 0}`}
          paper={paper}
          editable
          checkedBy={teacher?.teacherName}
          onSave={(p) => {
            savePaper(p);
            setSavedNote('Corrections saved. This paper is marked edited.');
          }}
        />

        <View className="gap-2 pt-2">
          <Button size="lg" onPress={() => router.dismissTo('/check')}>
            <Text>Check next paper</Text>
          </Button>
          <Button variant="outline" onPress={() => router.dismissTo('/papers')}>
            <Text>Done — go to My papers</Text>
          </Button>
        </View>
      </Screen>
    </>
  );
}
