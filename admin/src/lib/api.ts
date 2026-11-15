import type { PostgrestError } from '@supabase/supabase-js';

import { BANDS, timeZone, type BandKey } from './format';
import { supabase } from './supabase';

/** A teacher counts as online if the app sent a heartbeat within this many minutes. */
export const ONLINE_MINUTES = 5;

function fail(error: PostgrestError | null): asserts error is null {
  if (error) throw new Error(error.message || 'Something went wrong talking to the database.');
}

// ── Access ────────────────────────────────────────────────────────────────────

export async function isOwner(userId: string) {
  const { data, error } = await supabase.from('teachers').select('is_owner').eq('id', userId).maybeSingle();
  fail(error);
  return !!data?.is_owner;
}

// ── Overview ──────────────────────────────────────────────────────────────────

export interface Overview {
  generated_at: string;
  days: number;
  online_minutes: number;
  teachers: {
    total: number;
    online: number;
    active_today: number;
    active_7d: number;
    new_period: number;
    suspended: number;
    owners: number;
  };
  items: number;
  papers: {
    total: number;
    period: number;
    today: number;
    scored: number;
    passing: number;
    avg_pct: number | null;
    unreadable: number;
    edited: number;
    demo: number;
  };
  by_day: { day: string; papers: number }[];
  by_kind: { kind: 'essay' | 'math'; papers: number; avg_pct: number | null }[];
  bands: Record<BandKey, number>;
  top_teachers: { id: string; name: string; papers: number }[];
}

export async function fetchOverview(days: number) {
  const { data, error } = await supabase.rpc('admin_overview', {
    p_days: days,
    p_tz: timeZone(),
    p_online_minutes: ONLINE_MINUTES,
  });
  fail(error);
  return data as Overview;
}

// ── Teachers ──────────────────────────────────────────────────────────────────

export interface TeacherRow {
  id: string;
  teacher_name: string;
  subject: string;
  email: string | null;
  is_owner: boolean;
  suspended: boolean;
  online: boolean;
  last_active: string;
  last_sign_in_at: string | null;
  created_at: string;
  items: number;
  papers: number;
  papers_7d: number;
  avg_pct: number | null;
  last_paper_at: string | null;
}

export async function fetchTeachers() {
  const { data, error } = await supabase.rpc('admin_teachers', { p_online_minutes: ONLINE_MINUTES });
  fail(error);
  return (data ?? []) as TeacherRow[];
}

export async function updateTeacher(id: string, patch: { isOwner?: boolean; suspended?: boolean }) {
  const { error } = await supabase.rpc('admin_update_teacher', {
    p_teacher: id,
    p_is_owner: patch.isOwner ?? null,
    p_suspended: patch.suspended ?? null,
  });
  fail(error);
}

// ── Papers (read-only for the owner, spec §2) ─────────────────────────────────

export type PaperStatus = '' | BandKey | 'unreadable' | 'edited' | 'demo';

export interface PaperFilters {
  teacherId: string;
  kind: '' | 'essay' | 'math';
  status: PaperStatus;
  /** Days back from now; 0 = all time. */
  days: number;
  search: string;
  /** Only papers checked before this moment (maintenance export). */
  before?: string;
  demoOnly?: boolean;
}

export const EMPTY_FILTERS: PaperFilters = { teacherId: '', kind: '', status: '', days: 30, search: '' };

export interface Criterion {
  name: string;
  max: number;
  score: number;
  reason: string;
}

export interface PaperRow {
  id: string;
  teacher_id: string;
  kind: 'essay' | 'math';
  learner: string;
  section: string;
  item_title: string;
  readable: boolean;
  total: number;
  max: number;
  pct: number;
  edited: boolean;
  demo: boolean;
  checked_at: string;
  teacher: { teacher_name: string } | null;
}

export interface PaperDetail extends PaperRow {
  question: string;
  issue: string;
  transcription: string;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  feedback: string;
  note: string;
  legibility: string;
  details: Record<string, unknown>;
  edited_at: string | null;
}

const ROW_COLUMNS =
  'id, teacher_id, kind, learner, section, item_title, readable, total, max, pct, edited, demo, checked_at, teacher:teachers(teacher_name)';
const DETAIL_COLUMNS = `${ROW_COLUMNS}, question, issue, transcription, criteria, strengths, improvements, feedback, note, legibility, details, edited_at`;

/** Strip characters that have meaning inside a PostgREST or() filter or an ilike pattern. */
function cleanSearch(s: string) {
  return s.replace(/[,()%*\\:"']/g, ' ').trim().slice(0, 80);
}

/** The slice of the PostgREST filter builder that applyFilters uses. */
interface Filterable<Q> {
  eq(column: string, value: unknown): Q;
  gte(column: string, value: unknown): Q;
  lte(column: string, value: unknown): Q;
  lt(column: string, value: unknown): Q;
  or(filters: string): Q;
}

function applyFilters<Q extends Filterable<Q>>(query: Q, f: PaperFilters): Q {
  let q = query;
  if (f.teacherId) q = q.eq('teacher_id', f.teacherId);
  if (f.kind) q = q.eq('kind', f.kind);
  if (f.days > 0) q = q.gte('checked_at', new Date(Date.now() - f.days * 86_400_000).toISOString());
  if (f.before) q = q.lt('checked_at', f.before);
  if (f.demoOnly) q = q.eq('demo', true);

  const band = BANDS.find((b) => b.key === f.status);
  if (band) {
    q = q.eq('readable', true).eq('demo', false).gte('pct', band.min).lte('pct', band.max);
  } else if (f.status === 'unreadable') q = q.eq('readable', false);
  else if (f.status === 'edited') q = q.eq('edited', true);
  else if (f.status === 'demo') q = q.eq('demo', true);

  const s = cleanSearch(f.search);
  if (s) q = q.or(`learner.ilike.%${s}%,section.ilike.%${s}%,item_title.ilike.%${s}%`);
  return q;
}

export async function fetchPapers(f: PaperFilters, page: number, pageSize: number) {
  const from = page * pageSize;
  const query = supabase
    .from('papers')
    .select(ROW_COLUMNS, { count: 'exact' })
    .order('checked_at', { ascending: false })
    .range(from, from + pageSize - 1);
  const { data, error, count } = await applyFilters(query, f);
  fail(error);
  return { rows: (data ?? []) as unknown as PaperRow[], count: count ?? 0 };
}

export async function fetchPaper(id: string) {
  const { data, error } = await supabase.from('papers').select(DETAIL_COLUMNS).eq('id', id).single();
  fail(error);
  return data as unknown as PaperDetail;
}

/** Everything matching the filters, in pages of 1,000 (the API's row cap), up to `limit`. */
export async function fetchPapersForExport(f: PaperFilters, limit = 25_000) {
  const out: PaperDetail[] = [];
  const pageSize = 1000;
  for (let from = 0; from < limit; from += pageSize) {
    const query = supabase
      .from('papers')
      .select(DETAIL_COLUMNS)
      .order('checked_at', { ascending: false })
      .order('id')
      .range(from, Math.min(from + pageSize, limit) - 1);
    const { data, error } = await applyFilters(query, f);
    fail(error);
    const rows = (data ?? []) as unknown as PaperDetail[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export async function purgePapers(before: Date, opts: { demoOnly: boolean; dryRun: boolean }) {
  const { data, error } = await supabase.rpc('admin_purge_papers', {
    p_before: before.toISOString(),
    p_demo_only: opts.demoOnly,
    p_dry_run: opts.dryRun,
  });
  fail(error);
  return data as number;
}
