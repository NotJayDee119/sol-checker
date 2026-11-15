import { percentOf } from './rating';
import type { Criterion, Item, Paper } from './types';

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function totals(criteria: Pick<Criterion, 'score' | 'max'>[]) {
  const total = criteria.reduce((s, c) => s + c.score, 0);
  const max = criteria.reduce((s, c) => s + c.max, 0);
  return { total, max, pct: percentOf(total, max) };
}

export interface ScoredPaper {
  id: string;
  learner: string;
  section: string;
  /** One score per rubric row, in rubric order. */
  scores: number[];
  strengths: string[];
  improvements: string[];
  feedback: string;
  /** Saved page file names (see lib/paper-photos.ts). */
  photos: string[];
}

/**
 * Build the saved record for a paper the teacher scored by hand. Criterion names and max
 * points come from the item's rubric; scores are clamped to 0…max and the app computes totals.
 */
export function createPaper(item: Item, input: ScoredPaper): Paper {
  const criteria: Criterion[] = item.rubric.map((r, i) => ({
    name: r.name,
    max: r.pts,
    score: clamp(Math.round(input.scores[i] ?? 0), 0, r.pts),
    reason: '',
  }));

  const base = {
    id: input.id,
    learner: input.learner,
    section: input.section,
    itemId: item.id,
    itemTitle: item.title,
    grade: item.grade,
    question: item.q,
    readable: true,
    issue: '',
    transcription: '',
    criteria,
    ...totals(criteria),
    strengths: input.strengths,
    improvements: input.improvements,
    feedback: input.feedback,
    note: '',
    legibility: '' as const,
    checkedAt: Date.now(),
    edited: false,
    editedAt: null,
    manual: true,
    photos: input.photos,
  };

  if (item.kind === 'math') {
    return {
      ...base,
      kind: 'math',
      steps: [],
      firstError: '',
      finalAnswer: '',
      finalCorrect: false,
      correctAnswer: '',
      misconceptions: [],
    };
  }
  return { ...base, kind: 'essay', word_count: 0, minWords: item.words, found: [], missing: [], errors: [] };
}
