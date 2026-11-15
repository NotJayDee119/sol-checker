/** Data shapes from the SOL spec §7.3. Papers are scored by the teacher; photos are kept on this phone as proof. */

export type ItemKind = 'essay' | 'math';
export type Strictness = 'lenient' | 'balanced' | 'strict';
export type Legibility = 'good' | 'fair' | 'poor' | '';
export type StepStatus = 'correct' | 'error' | 'unclear';

export const FEEDBACK_LANGUAGES = [
  'English',
  'Filipino',
  'English with Filipino explanation',
  "Same language as the learner's answer",
] as const;
export type FeedbackLanguage = (typeof FEEDBACK_LANGUAGES)[number];

export interface Teacher {
  teacherName: string;
  subject: string;
  /** Grade levels taught, e.g. "Grade 7, Grade 8". Empty or missing when not given. */
  gradeLevel?: string;
  lastActive: number;
  /** Profile photo as a small JPEG data URI, kept on this device (and in Supabase when signed in). */
  photo?: string | null;
  /**
   * The "avatars" object `photo` matches (null = no photo in Supabase). Undefined until
   * the photo has been synced once, e.g. a photo chosen before accounts existed.
   */
  photoPath?: string | null;
  /** `photo` changed on this phone and isn't in Supabase yet. */
  photoDirty?: boolean;
}

export interface RubricRow {
  name: string;
  /** What earns full points. */
  desc: string;
  pts: number;
}

export interface Item {
  id: string;
  kind: ItemKind;
  title: string;
  /** Question (essay) or problem (math). */
  q: string;
  grade: string;
  /** Expected key points (essay) or answer key / expected solution (math). */
  key: string;
  /** Minimum words (essay only; 0 = none). */
  words: number;
  lang: FeedbackLanguage;
  strict: Strictness;
  rubric: RubricRow[];
  updatedAt: number;
}

export interface Criterion {
  name: string;
  max: number;
  score: number;
  reason: string;
}

export interface LanguageError {
  wrong: string;
  correct: string;
  type: string;
}

export interface MathStep {
  work: string;
  status: StepStatus;
  comment: string;
}

interface PaperBase {
  id: string;
  learner: string;
  section: string;
  itemId: string;
  itemTitle: string;
  /** Grade/level of the item when checked, e.g. "Grade 8". Picks the paper's folder. Missing on older papers. */
  grade?: string;
  question: string;
  readable: boolean;
  issue: string;
  transcription: string;
  criteria: Criterion[];
  total: number;
  max: number;
  pct: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  note: string;
  legibility: Legibility;
  checkedAt: number;
  edited: boolean;
  editedAt: number | null;
  /** Scored by the teacher on the Check screen. Older papers came from the AI checker. */
  manual?: boolean;
  /** Saved page file names, in order (see lib/paper-photos.ts). Missing or empty = no photos kept. */
  photos?: string[];
}

export interface EssayPaper extends PaperBase {
  kind: 'essay';
  word_count: number;
  minWords: number;
  found: string[];
  missing: string[];
  errors: LanguageError[];
}

export interface MathPaper extends PaperBase {
  kind: 'math';
  steps: MathStep[];
  firstError: string;
  finalAnswer: string;
  finalCorrect: boolean;
  correctAnswer: string;
  misconceptions: string[];
}

export type Paper = EssayPaper | MathPaper;

export const KIND_LABEL: Record<ItemKind, string> = { essay: 'Essay', math: 'Math solution' };

export const STRICTNESS_LABEL: Record<Strictness, string> = {
  lenient: 'Lenient',
  balanced: 'Balanced',
  strict: 'Strict',
};

export function rubricTotal(rubric: Pick<RubricRow, 'pts'>[]) {
  return rubric.reduce((sum, r) => sum + (Number.isFinite(r.pts) ? r.pts : 0), 0);
}
