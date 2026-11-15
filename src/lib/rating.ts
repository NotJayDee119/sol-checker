/** Rating scale from spec §5. */

export const PASSING_PCT = 75;

export function percentOf(total: number, max: number) {
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

export function descriptor(pct: number) {
  if (pct >= 90) return 'Outstanding';
  if (pct >= 85) return 'Very Satisfactory';
  if (pct >= 80) return 'Satisfactory';
  if (pct >= 75) return 'Fairly Satisfactory';
  return 'Did Not Meet Expectations';
}

export type Tone = 'success' | 'info' | 'warning' | 'destructive';

export function ratingTone(pct: number): Tone {
  if (pct >= 85) return 'success';
  if (pct >= 75) return 'info';
  if (pct >= 60) return 'warning';
  return 'destructive';
}
