import type { Item, Paper } from './types';

/** Folder for papers whose item has no grade typed in. */
export const NO_GRADE = 'No grade';

export interface Folder {
  /** Shown on the folder and used as its route param, e.g. "Grade 8". */
  name: string;
  papers: Paper[];
  avg: number;
  lastCheckedAt: number;
}

/**
 * Turns the free-text grade on an item into a folder name, so "8", "Gr. 8", "grade 8"
 * and "Grade 8 – Science" all land in "Grade 8". Anything unrecognised keeps its own
 * text as the folder name.
 */
export function folderName(grade: string | undefined): string {
  const g = (grade ?? '').trim();
  if (!g) return NO_GRADE;
  // Number first, so "Grade 8 (K-12)" is Grade 8, not Kinder.
  // A standalone 1–12, also right after letters as in "G8".
  const n = g.match(/(?:^|\D)(1[0-2]|[1-9])(?!\d)/);
  if (n) return `Grade ${n[1]}`;
  if (/\b(k|kinder|kindergarten)\b/i.test(g)) return 'Kinder';
  return g.replace(/\s+/g, ' ');
}

/** Papers saved before folders existed have no grade; fall back to their item's. */
export function paperGrade(paper: Paper, items: Item[]) {
  if (paper.grade !== undefined) return paper.grade;
  return items.find((i) => i.id === paper.itemId)?.grade ?? '';
}

/** School order: Kinder, Grade 1 … Grade 12, other names A–Z, then "No grade". */
function rank(name: string) {
  if (name === 'Kinder') return 0;
  const m = name.match(/^Grade (\d+)$/);
  if (m) return Number(m[1]);
  if (name === NO_GRADE) return 100;
  return 50;
}

export function groupIntoFolders(papers: Paper[], items: Item[]): Folder[] {
  const map = new Map<string, Paper[]>();
  for (const p of papers) {
    const name = folderName(paperGrade(p, items));
    const list = map.get(name);
    if (list) list.push(p);
    else map.set(name, [p]);
  }
  return [...map]
    .map(([name, list]) => {
      const sorted = list.slice().sort((a, b) => b.checkedAt - a.checkedAt);
      return {
        name,
        papers: sorted,
        avg: Math.round(sorted.reduce((sum, p) => sum + p.pct, 0) / sorted.length),
        lastCheckedAt: sorted[0].checkedAt,
      };
    })
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
