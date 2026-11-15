/** Rating scale from spec §5 — kept in step with src/lib/rating.ts in the app. */
export const PASSING_PCT = 75;

export const BANDS = [
  { key: 'outstanding', label: 'Outstanding', range: '90–100', min: 90, max: 100 },
  { key: 'very_satisfactory', label: 'Very Satisfactory', range: '85–89', min: 85, max: 89 },
  { key: 'satisfactory', label: 'Satisfactory', range: '80–84', min: 80, max: 84 },
  { key: 'fairly_satisfactory', label: 'Fairly Satisfactory', range: '75–79', min: 75, max: 79 },
  { key: 'did_not_meet', label: 'Did Not Meet Expectations', range: 'Below 75', min: 0, max: 74 },
] as const;

export type BandKey = (typeof BANDS)[number]['key'];

export function descriptor(pct: number) {
  return BANDS.find((b) => pct >= b.min)?.label ?? BANDS[BANDS.length - 1].label;
}

export type Tone = 'success' | 'info' | 'warning' | 'danger';

export function ratingTone(pct: number): Tone {
  if (pct >= 85) return 'success';
  if (pct >= 75) return 'info';
  if (pct >= 60) return 'warning';
  return 'danger';
}

export const KIND_LABEL = { essay: 'Essay', math: 'Math solution' } as const;

const numberFmt = new Intl.NumberFormat('en-PH');
export const fmtNumber = (n: number | null | undefined) => (n == null ? '—' : numberFmt.format(n));

/** "1 account", "3 accounts". */
export function plural(n: number, one: string, many: string) {
  return `${fmtNumber(n)} ${n === 1 ? one : many}`;
}

export function fmtPct(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—';
}

const dateTimeFmt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const dateFmt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
const shortDayFmt = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' });

export const fmtDateTime = (iso: string | null) => (iso ? dateTimeFmt.format(new Date(iso)) : '—');
export const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—');
/** "2026-11-15" (a calendar day from the database) → "Nov 15". */
export const fmtDay = (day: string) => shortDayFmt.format(new Date(`${day}T00:00:00`));

/** "just now", "4 min ago", "3 h ago", "2 days ago", then a date. */
export function fmtRelative(iso: string | null, now = Date.now()) {
  if (!iso) return 'Never';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  return fmtDate(iso);
}

export function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Manila';
  } catch {
    return 'Asia/Manila';
  }
}

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** yyyy-mm-dd in local time, for <input type="date"> and file names. */
export function isoDay(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
