import { router } from 'expo-router';
import { Info, TriangleAlert } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CommentChips } from '@/components/comment-chips';
import { Field } from '@/components/field';
import { PhotoPicker } from '@/components/photo-picker';
import { ScorePicker } from '@/components/score-picker';
import { Screen, ScreenTitle, SectionLabel } from '@/components/screen';
import { useToast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { commentBank, composeFeedback } from '@/lib/comments';
import { folderName } from '@/lib/folders';
import { discardPhotos, MAX_PHOTOS, type PageImage } from '@/lib/images';
import { CAN_KEEP_PHOTOS, keepPaperPhotos } from '@/lib/paper-photos';
import { descriptor, PASSING_PCT, percentOf } from '@/lib/rating';
import { createPaper } from '@/lib/scoring';
import { useStore } from '@/lib/store';
import { KIND_LABEL, rubricTotal } from '@/lib/types';
import { cn, createId } from '@/lib/utils';

type Status = { tone: 'info' | 'error'; text: string } | null;

/** "2 · Check a paper" (spec §4.3): the teacher reads the paper and scores each rubric criterion. */
export default function Check() {
  const { activeItem, items, lastSection, setLastSection, savePaper } = useStore();
  const toast = useToast();
  const [learner, setLearner] = useState('');
  const [section, setSection] = useState(lastSection);
  const [photos, setPhotos] = useState<PageImage[]>([]);
  const [scores, setScores] = useState<(number | null)[]>([]);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  const rubric = useMemo(() => activeItem?.rubric ?? [], [activeItem]);
  const bank = activeItem ? commentBank(activeItem.kind, activeItem.lang) : null;

  // A different item (or an edited rubric) starts the scores and comments over.
  // Reset while rendering rather than in an effect, so the old scores never show.
  const rubricKey = activeItem ? `${activeItem.id}:${activeItem.updatedAt}` : '';
  const [scoredKey, setScoredKey] = useState(rubricKey);
  if (scoredKey !== rubricKey) {
    setScoredKey(rubricKey);
    setScores(rubric.map(() => null));
    setStrengths([]);
    setImprovements([]);
    setStatus(null);
  }

  const { total, max, scored } = useMemo(() => {
    let total = 0;
    let scored = 0;
    rubric.forEach((_, i) => {
      const s = scores[i];
      if (s !== null && s !== undefined) {
        total += s;
        scored += 1;
      }
    });
    return { total, max: rubricTotal(rubric), scored };
  }, [rubric, scores]);
  const allScored = rubric.length > 0 && scored === rubric.length;
  const pct = percentOf(total, max);

  function setScore(i: number, score: number) {
    setScores((s) => rubric.map((_, j) => (j === i ? score : (s[j] ?? null))));
    if (status?.tone === 'error') setStatus(null);
  }

  async function onSave() {
    if (!activeItem) return setStatus({ tone: 'error', text: 'Choose or set up an item first.' });
    if (!allScored) {
      const missing = rubric.filter((_, i) => scores[i] === null || scores[i] === undefined).map((r) => r.name);
      return setStatus({ tone: 'error', text: `Score every part of the rubric first: ${missing.join(', ')}.` });
    }

    const id = createId('paper_');
    const name = learner.trim() || 'Unnamed learner';
    setSaving(true);
    setStatus(null);
    try {
      let saved: string[] = [];
      try {
        saved = await keepPaperPhotos(
          id,
          photos.map((p) => p.uri)
        );
      } catch {
        setStatus({
          tone: 'error',
          text: "The photos couldn't be saved. The phone may be low on storage. Free some space, then press Save again.",
        });
        return;
      }

      const paper = createPaper(activeItem, {
        id,
        learner: name,
        section: section.trim(),
        scores: scores.map((s) => s ?? 0),
        strengths,
        improvements,
        feedback: composeFeedback(feedback, strengths, improvements),
        photos: saved,
      });
      savePaper(paper);
      discardPhotos(photos.map((p) => p.uri));

      // Ready for the next learner: section stays, everything else clears.
      setPhotos([]);
      setLearner('');
      setScores(rubric.map(() => null));
      setStrengths([]);
      setImprovements([]);
      setFeedback('');
      setLastSection(section.trim());
      toast({ title: `Saved to ${folderName(paper.grade)}`, message: 'Find it in Folders.' });
      router.push({ pathname: '/paper/[id]', params: { id: paper.id, fresh: '1' } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenTitle title="Check a paper" subtitle="One learner at a time. Read the paper, then score each part." />

      {/* Which item */}
      {activeItem ? (
        <Card className="gap-1 p-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-0.5">
              <Text variant="overline" tone="muted">
                Checking with
              </Text>
              <Text variant="headline">{activeItem.title}</Text>
              <Text variant="footnote" tone="muted">
                {KIND_LABEL[activeItem.kind]} · {rubricTotal(activeItem.rubric)} points · {activeItem.rubric.length}{' '}
                criteria
              </Text>
            </View>
            <Button variant="ghost" size="sm" onPress={() => router.navigate('/items')} disabled={saving}>
              <Text>Change</Text>
            </Button>
          </View>
          {activeItem.q ? (
            <Text variant="subhead" numberOfLines={3} className="mt-1">
              {activeItem.q}
            </Text>
          ) : null}
          {activeItem.key ? (
            <View className="mt-2 gap-1 rounded-lg bg-muted p-3">
              <Text variant="caption" tone="muted" className="font-semibold uppercase">
                {activeItem.kind === 'math' ? 'Answer key' : 'Expected key points'}
              </Text>
              <Text variant="subhead" className={activeItem.kind === 'math' ? 'font-mono' : undefined} selectable>
                {activeItem.key}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : (
        <Card className="gap-3 p-4">
          <Text variant="headline">Is the item already saved?</Text>
          <Text variant="subhead" tone="muted">
            Pick it from My items, or set up a new essay or math item first.
          </Text>
          <View className="flex-row gap-2">
            {items.length ? (
              <Button variant="outline" className="flex-1" onPress={() => router.navigate('/items')}>
                <Text>My saved items</Text>
              </Button>
            ) : null}
            <Button className="flex-1" onPress={() => router.push({ pathname: '/item/[id]', params: { id: 'new' } })}>
              <Text>Set up new item</Text>
            </Button>
          </View>
        </Card>
      )}

      {/* Learner */}
      <Card className="gap-3 p-4">
        <View className="flex-row gap-3">
          <Field
            containerClassName="flex-[3]"
            label="Learner name"
            value={learner}
            onChangeText={setLearner}
            placeholder="Unnamed learner"
            autoCapitalize="words"
            editable={!saving}
          />
          <Field
            containerClassName="flex-[2]"
            label="Section"
            value={section}
            onChangeText={setSection}
            placeholder="e.g. 8-Rizal"
            autoCapitalize="words"
            editable={!saving}
          />
        </View>
        <Text variant="footnote" tone="muted">
          Name and section only — no LRNs or other personal data.
        </Text>
      </Card>

      {/* Photos */}
      <SectionLabel>Photos of the answer</SectionLabel>
      <PhotoPicker
        photos={photos}
        onChange={(p) => {
          setPhotos(p);
          if (status?.tone === 'error') setStatus(null);
        }}
        max={MAX_PHOTOS}
        disabled={saving}
        onError={(text) => setStatus({ tone: 'error', text })}
      />
      <Text variant="footnote" tone="muted" className="-mt-2">
        {CAN_KEEP_PHOTOS
          ? 'Optional. The photos are saved on this phone with the score, as proof.'
          : 'Optional. In the browser, photos are only shown while you score; use the phone app to keep them.'}
      </Text>

      {activeItem ? (
        <>
          {/* Scores */}
          <SectionLabel>Scores</SectionLabel>
          <Card className="gap-5 p-4">
            {rubric.map((r, i) => (
              <View key={`${i}-${r.name}`} className="gap-2">
                <View className="flex-row items-baseline gap-2">
                  <Text variant="subhead" className="flex-1 font-semibold">
                    {r.name}
                  </Text>
                  <Text className="font-mono-bold">
                    {scores[i] ?? '–'}
                    <Text className="font-mono text-muted-foreground"> / {r.pts}</Text>
                  </Text>
                </View>
                {r.desc ? (
                  <Text variant="footnote" tone="muted">
                    Full points: {r.desc}
                  </Text>
                ) : null}
                <ScorePicker
                  label={r.name}
                  max={r.pts}
                  value={scores[i] ?? null}
                  onChange={(s) => setScore(i, s)}
                  disabled={saving}
                />
              </View>
            ))}

            <View className="gap-1 border-t border-border pt-3">
              <View className="flex-row items-baseline justify-between">
                <Text variant="subhead" tone="muted">
                  Total
                </Text>
                <Text className="font-mono-bold text-lg">
                  {total} / {max}
                </Text>
              </View>
              {allScored ? (
                <Text
                  variant="subhead"
                  className={cn('text-right font-semibold', pct >= PASSING_PCT ? 'text-success' : 'text-primary')}
                >
                  {pct}% · {descriptor(pct)} · {pct >= PASSING_PCT ? 'Passed' : 'Below 75%'}
                </Text>
              ) : (
                <Text variant="footnote" tone="muted" className="text-right">
                  {scored} of {rubric.length} scored
                </Text>
              )}
            </View>
          </Card>

          {/* Feedback */}
          {bank ? (
            <>
              <SectionLabel>Feedback for the learner</SectionLabel>
              <Card className="gap-4 p-4">
                <CommentChips
                  label="Did well"
                  options={bank.strengths}
                  selected={strengths}
                  onChange={setStrengths}
                  tone="success"
                  disabled={saving}
                />
                <CommentChips
                  label="To improve"
                  options={bank.improvements}
                  selected={improvements}
                  onChange={setImprovements}
                  tone="warning"
                  disabled={saving}
                />
                <View className="gap-1.5">
                  <Text variant="footnote" className="ml-0.5 font-semibold">
                    Your note (optional)
                  </Text>
                  <Input
                    multiline
                    className="min-h-24"
                    value={feedback}
                    onChangeText={setFeedback}
                    editable={!saving}
                    placeholder="Leave empty to use the comments you tapped."
                    accessibilityLabel="Feedback for the learner"
                  />
                </View>
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {/* Status line */}
      {status ? (
        <View
          className={cn(
            'flex-row items-center gap-2.5 rounded-lg p-3',
            status.tone === 'error' ? 'bg-secondary' : 'bg-accent'
          )}
          role={status.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          <Icon
            as={status.tone === 'error' ? TriangleAlert : Info}
            size={18}
            className={status.tone === 'error' ? 'text-primary' : 'text-info'}
          />
          <Text variant="subhead" className="flex-1">
            {status.text}
          </Text>
        </View>
      ) : null}

      <Button size="lg" onPress={onSave} loading={saving} disabled={saving || !activeItem}>
        <Text>{saving ? 'Saving…' : 'Save score'}</Text>
      </Button>
    </Screen>
  );
}
