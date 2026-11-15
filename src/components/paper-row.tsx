import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ratingTone } from '@/lib/rating';
import type { Paper } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

const TONE_CLASS = {
  success: 'bg-success/10 text-success',
  info: 'bg-accent text-accent-foreground',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-secondary text-primary',
} as const;

export function PaperRow({
  paper,
  showCriteria,
  footer,
}: {
  paper: Paper;
  /** Per-criterion scores, shown only when every listed paper shares the same rubric (spec §4.5). */
  showCriteria?: boolean;
  footer?: ReactNode;
}) {
  const toneCls = TONE_CLASS[ratingTone(paper.pct)].split(' ');
  return (
    <View className="overflow-hidden rounded-lg border border-border bg-card">
      <PressableScale
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/paper/[id]', params: { id: paper.id } })}
        className="flex-row items-center gap-3 p-3.5"
        accessibilityRole="button"
        accessibilityLabel={`${paper.learner}, ${paper.total} out of ${paper.max}, ${paper.pct} percent. View`}
      >
        <View className={cn('h-12 w-12 items-center justify-center rounded-full', toneCls[0])}>
          <Text className={cn('font-mono-bold text-[13px]', toneCls[1])}>{paper.pct}%</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <Text variant="headline" numberOfLines={1} className="shrink">
              {paper.learner}
            </Text>
            {paper.edited ? (
              <Badge variant="info" className="px-1.5 py-0">
                <Text className="text-[10px]">edited</Text>
              </Badge>
            ) : null}
          </View>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {[paper.section, `${paper.itemTitle}${paper.kind === 'math' ? ' (Math)' : ''}`].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            <Text className="font-mono text-[13px] text-foreground">
              {paper.total}/{paper.max}
            </Text>{' '}
            · {formatDate(paper.checkedAt)}
          </Text>
          {showCriteria ? (
            <Text className="font-mono text-[12px] text-muted-foreground" numberOfLines={1}>
              {paper.criteria.map((c) => `${c.score}/${c.max}`).join('  ')}
            </Text>
          ) : null}
        </View>
        <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
      </PressableScale>
      {footer}
    </View>
  );
}
