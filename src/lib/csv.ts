import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { KIND_LABEL, type Paper } from './types';

/**
 * CSV export from spec §7.4: UTF-8 with BOM (opens correctly in Excel), CRLF line endings,
 * every value quoted. Exports only the rows passed in (the currently filtered rows).
 */
export function buildCsv(papers: Paper[]) {
  const criterionCount = papers.reduce((n, p) => Math.max(n, p.criteria.length), 0);
  const header = ['Learner', 'Section', 'Item', 'Type'];
  for (let i = 1; i <= criterionCount; i++) header.push(`Criterion ${i}`, `Score ${i}`, `Max ${i}`);
  header.push('Total', 'Max', 'Percent', 'Edited', 'Checked', 'Feedback');

  const rows = papers.map((p) => {
    const row: (string | number)[] = [p.learner, p.section, p.itemTitle, KIND_LABEL[p.kind]];
    for (let i = 0; i < criterionCount; i++) {
      const c = p.criteria[i];
      row.push(c?.name ?? '', c?.score ?? '', c?.max ?? '');
    }
    row.push(p.total, p.max, p.pct, p.edited ? 'Yes' : 'No', formatStamp(p.checkedAt), p.feedback);
    return row;
  });

  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return '﻿' + [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n') + '\r\n';
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatStamp(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function csvFileName(date = new Date()) {
  return `sol-scores-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`;
}

/** Save the CSV: a browser download on web, the share sheet (Save to Files, Drive, email…) on phones. */
export async function exportCsv(papers: Paper[]) {
  const csv = buildCsv(papers);
  const name = csvFileName();

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("This device can't share files.");
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Save SOL scores',
  });
}
