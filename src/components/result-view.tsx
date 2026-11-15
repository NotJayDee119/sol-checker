import * as Clipboard from 'expo-clipboard';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Copy,
  Pencil,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { PaperPhotos } from '@/components/paper-photos';
import { ScoreMark } from '@/components/score-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { descriptor, ratingTone } from '@/lib/rating';
import { clamp, totals } from '@/lib/scoring';
import { KIND_LABEL, type EssayPaper, type MathPaper, type Paper, type StepStatus } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

/**
 * Full result for one paper (spec §4.4). When `editable`, each criterion score becomes a number
 * input (clamped 0…max), totals update live, feedback becomes a text box, and
 * "Save corrections" stores the change and flags the paper as edited.
 */
export function ResultView({
  paper,
  editable,
  onSave,
  checkedBy,
}: {
  paper: Paper;
  editable: boolean;
  onSave?: (paper: Paper) => void;
  checkedBy?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState(() => paper.criteria.map((c) => String(c.score)));
  const [feedback, setFeedback] = useState(paper.feedback);

  const liveCriteria = useMemo(
    () =>
      editing
        ? paper.criteria.map((c, i) => ({ ...c, score: clamp(Math.round(Number(scores[i]) || 0), 0, c.max) }))
        : paper.criteria,
    [editing, paper.criteria, scores]
  );
  const { total, max, pct } = editing ? totals(liveCriteria) : paper;
  const tone = ratingTone(pct);

  function startEdit() {
    setScores(paper.criteria.map((c) => String(c.score)));
    setFeedback(paper.feedback);
    setEditing(true);
  }

  function save() {
    onSave?.({
      ...paper,
      criteria: liveCriteria,
      ...totals(liveCriteria),
      feedback: feedback.trim(),
      edited: true,
      editedAt: Date.now(),
    });
    setEditing(false);
  }

  const meta = [
    checkedBy ? `Checked by ${checkedBy}` : '',
    paper.itemTitle,
    paper.kind === 'essay' && !paper.manual ? `${paper.word_count} words` : '',
    paper.legibility ? `Legibility: ${paper.legibility}` : '',
    formatDateTime(paper.checkedAt),
  ].filter(Boolean);

  return (
    <View className="gap-4">
      {/* Header */}
      <Card className="gap-3 p-4">
        <View className="flex-row flex-wrap gap-1.5">
          <Badge variant="muted">
            <Text>{KIND_LABEL[paper.kind]}</Text>
          </Badge>
          {!paper.readable ? (
            <Badge variant="destructive">
              <Text>Could not check</Text>
            </Badge>
          ) : null}
          {paper.edited ? (
            <Badge variant="info">
              <Text>Edited</Text>
            </Badge>
          ) : null}
        </View>
        <View className="flex-row items-center gap-3">
          <View className="flex-1 gap-1">
            <Text variant="title2" role="heading" numberOfLines={2}>
              {paper.learner}
            </Text>
            {paper.section ? (
              <Text variant="subhead" tone="muted">
                {paper.section}
              </Text>
            ) : null}
            <Text variant="headline" tone={tone === 'info' ? 'info' : tone}>
              {descriptor(pct)} · <Text className="font-mono-bold">{pct}%</Text>
            </Text>
          </View>
          <ScoreMark total={total} max={max} />
        </View>
        <Text variant="footnote" tone="muted">
          {meta.join(' · ')}
        </Text>
      </Card>

      {!paper.readable ? (
        <Callout tone="destructive" icon={TriangleAlert} title="Could not check">
          {paper.issue || 'The photo could not be read.'} Retake the photo and check again.
        </Callout>
      ) : null}

      {/* Criteria */}
      <Card className="gap-4 p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="headline" role="heading">
            Scores by criterion
          </Text>
          {editable && !editing ? (
            <Button variant="ghost" size="sm" onPress={startEdit}>
              <Icon as={Pencil} size={15} className="text-info" />
              <Text>Edit</Text>
            </Button>
          ) : null}
        </View>
        {liveCriteria.map((c, i) => (
          <View key={i} className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text variant="subhead" className="flex-1 font-semibold">
                {c.name}
              </Text>
              {editing ? (
                <View className="flex-row items-center gap-1.5">
                  <Input
                    className="h-10 w-16 text-center font-mono"
                    value={scores[i]}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                    accessibilityLabel={`${c.name} score, out of ${c.max}`}
                    onChangeText={(t) => setScores((s) => s.map((v, j) => (j === i ? t.replace(/[^0-9]/g, '') : v)))}
                    onBlur={() =>
                      setScores((s) =>
                        s.map((v, j) => (j === i ? String(clamp(Math.round(Number(v) || 0), 0, c.max)) : v))
                      )
                    }
                  />
                  <Text className="font-mono text-muted-foreground">/ {c.max}</Text>
                </View>
              ) : (
                <Text className="font-mono-bold">
                  {c.score}
                  <Text className="font-mono text-muted-foreground"> / {c.max}</Text>
                </Text>
              )}
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full bg-info"
                style={{ width: `${c.max > 0 ? (c.score / c.max) * 100 : 0}%` }}
              />
            </View>
            {c.reason ? (
              <Text variant="footnote" tone="muted">
                {c.reason}
              </Text>
            ) : null}
          </View>
        ))}
        {editing ? (
          <View className="flex-row items-baseline justify-end gap-2 border-t border-border pt-3">
            <Text variant="subhead" tone="muted">
              Total
            </Text>
            <Text className="font-mono-bold text-lg">
              {total} / {max}
            </Text>
            <Text variant="subhead" tone="muted">
              · {pct}% · {descriptor(pct)}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Word count, key points and step checks only exist on papers the old AI checker read. */}
      {paper.manual ? null : paper.kind === 'essay' ? <EssayDetails paper={paper} /> : <MathDetails paper={paper} />}

      {/* Skipped when the feedback below is just these comments joined together. */}
      {(paper.strengths.length || paper.improvements.length) &&
      !(paper.manual && paper.feedback === [...paper.strengths, ...paper.improvements].join(' ')) ? (
        <Card className="gap-3 p-4">
          {paper.strengths.length ? <BulletList title="Strengths" items={paper.strengths} tone="success" /> : null}
          {paper.improvements.length ? (
            <BulletList title="To improve" items={paper.improvements} tone="warning" />
          ) : null}
        </Card>
      ) : null}

      {/* Feedback */}
      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="headline" role="heading">
            Feedback for the learner
          </Text>
          {!editing && paper.feedback ? <CopyButton text={paper.feedback} /> : null}
        </View>
        {editing ? (
          <Input
            multiline
            className="min-h-32"
            value={feedback}
            onChangeText={setFeedback}
            accessibilityLabel="Feedback for the learner"
          />
        ) : (
          <Text variant="callout" selectable>
            {paper.feedback || '—'}
          </Text>
        )}
      </Card>

      {editing ? (
        <View className="flex-row gap-2">
          <Button variant="outline" className="flex-1" onPress={() => setEditing(false)}>
            <Text>Cancel</Text>
          </Button>
          <Button className="flex-[2]" onPress={save}>
            <Text>Save corrections</Text>
          </Button>
        </View>
      ) : null}

      {paper.photos?.length ? <PaperPhotos paperId={paper.id} photos={paper.photos} /> : null}

      <Transcription text={paper.transcription} mono={paper.kind === 'math'} />

      {paper.note ? (
        <Callout tone="info" icon={CircleHelp} title="Teacher check">
          {paper.note}
        </Callout>
      ) : null}
    </View>
  );
}

function EssayDetails({ paper }: { paper: EssayPaper }) {
  const short = paper.minWords > 0 && paper.word_count < paper.minWords;
  if (!paper.readable) return null;
  return (
    <>
      <Card className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Text variant="headline">Word count</Text>
          <Text className={cn('font-mono-bold', short && 'text-warning')}>
            {paper.word_count}
            {paper.minWords > 0 ? <Text className="font-mono text-muted-foreground"> / min {paper.minWords}</Text> : null}
          </Text>
        </View>
        {short ? (
          <Text variant="footnote" tone="warning">
            Below the minimum of {paper.minWords} words.
          </Text>
        ) : null}
        {paper.found.length ? <BulletList title="Key points present" items={paper.found} tone="success" /> : null}
        {paper.missing.length ? <BulletList title="Key points missing" items={paper.missing} tone="warning" /> : null}
      </Card>
      {paper.errors.length ? (
        <Card className="gap-2 p-4">
          <Text variant="headline" role="heading">
            Language errors
          </Text>
          <View className="flex-row border-b border-border pb-1.5">
            <Text variant="caption" tone="muted" className="flex-1 font-semibold">
              AS WRITTEN
            </Text>
            <Text variant="caption" tone="muted" className="flex-1 font-semibold">
              CORRECT
            </Text>
            <Text variant="caption" tone="muted" className="w-24 font-semibold">
              TYPE
            </Text>
          </View>
          {paper.errors.map((e, i) => (
            <View key={i} className="flex-row items-start py-1">
              <Text variant="subhead" className="flex-1 pr-2 text-primary line-through">
                {e.wrong}
              </Text>
              <Text variant="subhead" className="flex-1 pr-2 text-success">
                {e.correct}
              </Text>
              <Text variant="footnote" tone="muted" className="w-24">
                {e.type}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

const STEP_ICON: Record<StepStatus, { icon: typeof Check; cls: string; label: string }> = {
  correct: { icon: Check, cls: 'text-success', label: 'correct' },
  error: { icon: X, cls: 'text-primary', label: 'error' },
  unclear: { icon: CircleHelp, cls: 'text-warning', label: 'unclear' },
};

function MathDetails({ paper }: { paper: MathPaper }) {
  if (!paper.readable) return null;
  return (
    <>
      <Card className="gap-3 p-4">
        <Text variant="headline" role="heading">
          Learner&apos;s answer
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 font-mono text-lg">{paper.finalAnswer || '—'}</Text>
          <Text
            className={cn('font-hand text-[34px] leading-[38px]', paper.finalCorrect ? 'text-success' : 'text-primary')}
            accessibilityLabel={paper.finalCorrect ? 'Correct' : 'Incorrect'}
          >
            {paper.finalCorrect ? '✓' : '✗'}
          </Text>
        </View>
        {!paper.finalCorrect && paper.correctAnswer ? (
          <Text variant="subhead">
            <Text variant="subhead" tone="muted">
              Correct answer:{' '}
            </Text>
            <Text className="font-mono-bold text-success">{paper.correctAnswer}</Text>
          </Text>
        ) : null}
      </Card>

      {paper.firstError ? (
        <Callout tone="destructive" icon={TriangleAlert} title="First error">
          {paper.firstError}
        </Callout>
      ) : null}

      {paper.steps.length ? (
        <Card className="gap-1 p-4">
          <Text variant="headline" role="heading" className="mb-2">
            Step-by-step check
          </Text>
          {paper.steps.map((s, i) => {
            const st = STEP_ICON[s.status];
            return (
              <View key={i} className="flex-row gap-3 border-b border-border py-2.5 last:border-b-0">
                <Icon as={st.icon} size={20} className={st.cls} accessibilityLabel={st.label} />
                <View className="flex-1 gap-0.5">
                  <Text className="font-mono text-[15px]">{s.work}</Text>
                  {s.comment ? (
                    <Text variant="footnote" tone="muted">
                      {s.comment}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      {paper.misconceptions.length ? (
        <Card className="p-4">
          <BulletList title="Possible misconceptions" items={paper.misconceptions} tone="warning" />
        </Card>
      ) : null}
    </>
  );
}

function BulletList({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' }) {
  return (
    <View className="gap-1.5">
      <Text variant="subhead" className="font-semibold">
        {title}
      </Text>
      {items.map((t, i) => (
        <View key={i} className="flex-row gap-2">
          <View className={cn('mt-[8px] h-1.5 w-1.5 rounded-full', tone === 'success' ? 'bg-success' : 'bg-warning')} />
          <Text variant="subhead" className="flex-1">
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'destructive' | 'info';
  icon: typeof Check;
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      className={cn(
        'flex-row gap-3 rounded-lg border p-4',
        tone === 'destructive' ? 'border-primary/30 bg-secondary' : 'border-info/30 bg-accent'
      )}
      role={tone === 'destructive' ? 'alert' : undefined}
    >
      <Icon as={icon} size={20} className={tone === 'destructive' ? 'text-primary' : 'text-info'} />
      <View className="flex-1 gap-1">
        <Text variant="subhead" className="font-semibold">
          {title}
        </Text>
        <Text variant="subhead">{children}</Text>
      </View>
    </View>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={async () => {
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      accessibilityLabel="Copy feedback"
    >
      <Icon as={copied ? Check : Copy} size={15} className="text-info" />
      <Text>{copied ? 'Copied' : 'Copy'}</Text>
    </Button>
  );
}

/** Collapsible lined-paper transcription with [illegible] highlighted. */
function Transcription({ text, mono }: { text: string; mono: boolean }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const parts = text.split(/(\[illegible\])/gi);
  return (
    <Card className="overflow-hidden">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center justify-between p-4 active:bg-muted"
      >
        <Text variant="headline">Transcription</Text>
        <Icon as={open ? ChevronDown : ChevronRight} size={20} className="text-muted-foreground" />
      </Pressable>
      {open ? (
        <View className="border-t border-border bg-[#FFFEF8] px-4 pb-4 pt-2">
          <View className="border-l-2 border-primary/30 pl-3">
            <Text selectable className={cn('leading-7', mono ? 'font-mono text-[15px]' : 'text-[16px]')}>
              {parts.map((p, i) =>
                /^\[illegible\]$/i.test(p) ? (
                  <Text key={i} className="bg-warning/20 font-semibold text-warning">
                    {p}
                  </Text>
                ) : (
                  p
                )
              )}
            </Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}
