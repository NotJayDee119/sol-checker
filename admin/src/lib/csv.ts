import type { PaperDetail } from './api';
import { isoDay, KIND_LABEL, pad } from './format';

/**
 * CSV export from spec §7.4, matching the app's src/lib/csv.ts plus the Teacher column
 * used in the owner's all-teacher views: UTF-8 with BOM, CRLF, every value quoted.
 */
export function buildCsv(papers: PaperDetail[]) {
  const criterionCount = papers.reduce((n, p) => Math.max(n, p.criteria?.length ?? 0), 0);
  const header = ['Teacher', 'Learner', 'Section', 'Item', 'Type'];
  for (let i = 1; i <= criterionCount; i++) header.push(`Criterion ${i}`, `Score ${i}`, `Max ${i}`);
  header.push('Total', 'Max', 'Percent', 'Edited', 'Checked', 'Feedback');

  const rows = papers.map((p) => {
    const row: (string | number)[] = [
      p.teacher?.teacher_name ?? '',
      p.learner,
      p.section,
      p.item_title,
      KIND_LABEL[p.kind],
    ];
    for (let i = 0; i < criterionCount; i++) {
      const c = p.criteria?.[i];
      row.push(c?.name ?? '', c?.score ?? '', c?.max ?? '');
    }
    row.push(p.total, p.max, p.pct, p.edited ? 'Yes' : 'No', stamp(p.checked_at), p.feedback);
    return row;
  });

  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return '﻿' + [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n';
}

function stamp(iso: string) {
  const d = new Date(iso);
  return `${isoDay(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function downloadCsv(papers: PaperDetail[], name = `sol-scores-${isoDay()}.csv`) {
  const url = URL.createObjectURL(new Blob([buildCsv(papers)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
