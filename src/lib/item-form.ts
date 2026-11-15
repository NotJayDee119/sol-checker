import { SAMPLE_ITEMS, SAMPLE_RUBRIC } from './samples';
import type { FeedbackLanguage, Item, ItemKind, RubricRow, Strictness } from './types';

/** Editable shape of an item: numbers are kept as text while the teacher types. */
export interface RubricRowForm {
  name: string;
  desc: string;
  pts: string;
}

export interface ItemForm {
  kind: ItemKind;
  title: string;
  q: string;
  grade: string;
  key: string;
  words: string;
  lang: FeedbackLanguage;
  strict: Strictness;
  rubric: RubricRowForm[];
}

export function rubricToForm(rubric: RubricRow[]): RubricRowForm[] {
  return rubric.map((r) => ({ name: r.name, desc: r.desc, pts: String(r.pts) }));
}

export function itemToForm(item: Omit<Item, 'id' | 'updatedAt'>): ItemForm {
  return {
    kind: item.kind,
    title: item.title,
    q: item.q,
    grade: item.grade,
    key: item.key,
    words: item.words > 0 ? String(item.words) : '',
    lang: item.lang,
    strict: item.strict,
    rubric: rubricToForm(item.rubric),
  };
}

export function sampleForm(kind: ItemKind): ItemForm {
  return itemToForm(SAMPLE_ITEMS[kind]);
}

/** "New clears the form (keeps type)." */
export function blankForm(kind: ItemKind): ItemForm {
  return {
    kind,
    title: '',
    q: '',
    grade: '',
    key: '',
    words: '',
    lang: 'English',
    strict: 'balanced',
    rubric: [{ name: '', desc: '', pts: '' }],
  };
}

function sameRubric(a: RubricRowForm[], b: RubricRowForm[]) {
  return a.length === b.length && a.every((r, i) => r.name === b[i].name && r.desc === b[i].desc && r.pts === b[i].pts);
}

/**
 * Switching type swaps in the other sample's question/rubric only if the teacher hasn't
 * changed them (spec §4.2). Anything the teacher typed is kept.
 */
export function switchKind(form: ItemForm, kind: ItemKind): ItemForm {
  if (form.kind === kind) return form;
  const from = sampleForm(form.kind);
  const to = sampleForm(kind);
  const blank = blankForm(form.kind);
  const untouched = (field: 'title' | 'q' | 'grade' | 'key' | 'words') =>
    form[field] === from[field] || form[field] === blank[field];
  return {
    ...form,
    kind,
    title: untouched('title') ? to.title : form.title,
    q: untouched('q') ? to.q : form.q,
    grade: untouched('grade') ? to.grade : form.grade,
    key: untouched('key') ? to.key : form.key,
    words: kind === 'math' ? '' : untouched('words') ? to.words : form.words,
    rubric:
      sameRubric(form.rubric, from.rubric) || sameRubric(form.rubric, blank.rubric) ? to.rubric : form.rubric,
  };
}

export function withSampleRubric(form: ItemForm): ItemForm {
  return { ...form, rubric: rubricToForm(SAMPLE_RUBRIC[form.kind]) };
}

export function parsePoints(text: string) {
  const n = Number(text.trim());
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

export function formTotal(form: Pick<ItemForm, 'rubric'>) {
  return form.rubric.reduce((sum, r) => {
    const n = parsePoints(r.pts);
    return Number.isNaN(n) ? sum : sum + n;
  }, 0);
}

export type FormErrors = Partial<Record<'title' | 'q' | 'words' | 'rubric', string>> & {
  rows?: Record<number, { name?: string; pts?: string }>;
};

export function validateForm(form: ItemForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.title.trim()) errors.title = 'Give the item a name so you can find it again.';
  if (!form.q.trim()) errors.q = form.kind === 'math' ? 'Type the math problem.' : 'Type the question.';
  if (form.kind === 'essay' && form.words.trim()) {
    const w = Number(form.words.trim());
    if (!Number.isInteger(w) || w < 0) errors.words = 'Use a whole number, or leave it blank.';
  }
  const rows: NonNullable<FormErrors['rows']> = {};
  form.rubric.forEach((r, i) => {
    const row: { name?: string; pts?: string } = {};
    if (!r.name.trim()) row.name = 'Name this criterion.';
    const pts = parsePoints(r.pts);
    if (Number.isNaN(pts) || pts > 100) row.pts = '1–100';
    if (row.name || row.pts) rows[i] = row;
  });
  if (Object.keys(rows).length) {
    errors.rows = rows;
    errors.rubric = 'Fix the rubric rows marked in red.';
  }
  return errors;
}

export function hasErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}

export function formToItem(form: ItemForm, id: string): Item {
  return {
    id,
    kind: form.kind,
    title: form.title.trim(),
    q: form.q.trim(),
    grade: form.grade.trim(),
    key: form.key.trim(),
    words: form.kind === 'essay' ? Number(form.words.trim()) || 0 : 0,
    lang: form.lang,
    strict: form.strict,
    rubric: form.rubric.map((r) => ({ name: r.name.trim(), desc: r.desc.trim(), pts: parsePoints(r.pts) })),
    updatedAt: Date.now(),
  };
}
