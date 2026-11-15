import type { Item, ItemKind, RubricRow } from './types';

/** Default items from spec §4.2. Used to prefill new items. */
export type ItemDraft = Omit<Item, 'id' | 'updatedAt'>;

export const SAMPLE_RUBRIC: Record<ItemKind, RubricRow[]> = {
  essay: [
    {
      name: 'Content and relevance',
      desc: 'Answers the question fully with clear, relevant ideas and at least two examples.',
      pts: 10,
    },
    {
      name: 'Organization',
      desc: 'Has a clear beginning, middle and end; ideas flow logically.',
      pts: 5,
    },
    {
      name: 'Language use and mechanics',
      desc: 'Correct grammar, spelling and punctuation; appropriate word choice.',
      pts: 5,
    },
  ],
  math: [
    {
      name: 'Understanding the problem',
      desc: 'Identifies what is given and what is asked.',
      pts: 2,
    },
    {
      name: 'Strategy and method',
      desc: 'Chooses and shows a correct, complete method.',
      pts: 3,
    },
    {
      name: 'Accuracy of computation',
      desc: 'Computations are correct at every step.',
      pts: 3,
    },
    {
      name: 'Final answer (with label/unit)',
      desc: 'Correct final answer with the right unit or label.',
      pts: 2,
    },
  ],
};

export const SAMPLE_ITEMS: Record<ItemKind, ItemDraft> = {
  essay: {
    kind: 'essay',
    title: 'Effective Communication – Essay',
    q: 'In not less than 150 words, explain why effective communication is important in the workplace. Give at least two examples from your own experience or observation.',
    grade: 'Grade 11',
    key: 'Communication prevents misunderstandings and mistakes\nIt builds teamwork and trust\nIt helps serve customers or clients well\nAt least two concrete examples from experience or observation',
    words: 150,
    lang: 'English',
    strict: 'balanced',
    rubric: SAMPLE_RUBRIC.essay,
  },
  math: {
    kind: 'math',
    title: 'Fractions – Word Problem',
    q: 'A farmer harvested 1,250 kg of rice and sold 3/5 of it at ₱42 per kilogram. How much did the farmer earn from the rice sold? Show your complete solution.',
    grade: 'Grade 7',
    key: '3/5 × 1,250 kg = 750 kg\n750 kg × ₱42 = ₱31,500\nAnswer: The farmer earned ₱31,500.',
    words: 0,
    lang: 'English',
    strict: 'balanced',
    rubric: SAMPLE_RUBRIC.math,
  },
};
