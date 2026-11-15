import { useEffect, useState, type ReactNode } from 'react';

import { Badge, Card, Empty, ErrorBanner, Modal, PageHeader, Spinner } from '../components/ui';
import {
  EMPTY_FILTERS,
  fetchPaper,
  fetchPapers,
  fetchPapersForExport,
  fetchTeachers,
  type PaperDetail,
  type PaperFilters,
  type PaperStatus,
} from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { BANDS, descriptor, fmtDateTime, fmtNumber, KIND_LABEL, ratingTone } from '../lib/format';
import { errorMessage, useAsync } from '../lib/hooks';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: PaperStatus; label: string }[] = [
  { value: '', label: 'Any result' },
  ...BANDS.map((b) => ({ value: b.key as PaperStatus, label: `${b.label} (${b.range})` })),
  { value: 'unreadable', label: 'Unreadable photo' },
  { value: 'edited', label: 'Corrected by teacher' },
  { value: 'demo', label: 'Demo results' },
];

const DAY_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last 12 months' },
  { value: 0, label: 'All time' },
];

function filtersFromParams(params: URLSearchParams): PaperFilters {
  const days = Number(params.get('days'));
  const kind = params.get('kind');
  const status = params.get('status') ?? '';
  return {
    ...EMPTY_FILTERS,
    teacherId: params.get('teacher') ?? '',
    kind: kind === 'essay' || kind === 'math' ? kind : '',
    status: STATUS_OPTIONS.some((o) => o.value === status) ? (status as PaperStatus) : '',
    days: params.has('days') && DAY_OPTIONS.some((o) => o.value === days) ? days : EMPTY_FILTERS.days,
  };
}

export function Papers({ params }: { params: URLSearchParams }) {
  const paramKey = params.toString();
  const [filters, setFilters] = useState<PaperFilters>(() => filtersFromParams(params));
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Links from other pages (e.g. "View their papers") replace the filters.
  useEffect(() => {
    setFilters(filtersFromParams(new URLSearchParams(paramKey)));
    setSearchText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  // Debounce typing in the search box.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText })), 300);
    return () => clearTimeout(id);
  }, [searchText]);

  useEffect(() => setPage(0), [filters]);

  const teachers = useAsync(fetchTeachers, []);
  const papers = useAsync(() => fetchPapers(filters, page, PAGE_SIZE), [filters, page]);

  const set = <K extends keyof PaperFilters>(key: K, value: PaperFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const count = papers.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const isFiltered =
    filters.teacherId || filters.kind || filters.status || filters.search || filters.days !== EMPTY_FILTERS.days;

  const exportCsv = async () => {
    setExporting(true);
    setExportError('');
    try {
      const rows = await fetchPapersForExport(filters);
      if (rows.length) downloadCsv(rows);
      else setExportError('There are no papers to export with these filters.');
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Papers"
        subtitle="Every teacher's checked papers. Read-only: only the teacher who checked a paper can change it."
      >
        <button className="btn btn-primary" onClick={exportCsv} disabled={exporting || count === 0}>
          {exporting ? 'Preparing…' : `Download CSV${count ? ` (${fmtNumber(count)})` : ''}`}
        </button>
      </PageHeader>

      {exportError && <ErrorBanner message={exportError} />}

      <div className="filters">
        <input
          className="input grow"
          type="search"
          placeholder="Search learner, section or item"
          aria-label="Search papers"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <select
          className="input"
          aria-label="Teacher"
          value={filters.teacherId}
          onChange={(e) => set('teacherId', e.target.value)}
        >
          <option value="">All teachers</option>
          {(teachers.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.teacher_name || t.email || 'Unnamed teacher'}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Item type"
          value={filters.kind}
          onChange={(e) => set('kind', e.target.value as PaperFilters['kind'])}
        >
          <option value="">Essay and math</option>
          <option value="essay">Essay</option>
          <option value="math">Math solution</option>
        </select>
        <select
          className="input"
          aria-label="Result"
          value={filters.status}
          onChange={(e) => set('status', e.target.value as PaperStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Period"
          value={filters.days}
          onChange={(e) => set('days', Number(e.target.value))}
        >
          {DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {isFiltered && (
          <button
            className="link"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setSearchText('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {papers.error && <ErrorBanner message={papers.error} onRetry={papers.reload} />}

      <Card className="flush">
        {!papers.data ? (
          !papers.error && <div className="loading-block"><Spinner /></div>
        ) : papers.data.rows.length === 0 ? (
          <Empty title="No papers match these filters">
            {isFiltered ? 'Try a longer period or clear the filters.' : 'Papers appear here once teachers sync their results.'}
          </Empty>
        ) : (
          <>
            <div className={`table-wrap ${papers.loading ? 'is-loading' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Item</th>
                    <th>Teacher</th>
                    <th className="num">Score</th>
                    <th>Rating</th>
                    <th>Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.data.rows.map((p) => (
                    <tr key={p.id} className="is-clickable" onClick={() => setOpenId(p.id)}>
                      <td>
                        <button className="row-link" onClick={(e) => (e.stopPropagation(), setOpenId(p.id))}>
                          {p.learner || 'Unnamed learner'}
                        </button>
                        <div className="muted small">{p.section || '—'}</div>
                      </td>
                      <td>
                        <div>{p.item_title || '—'}</div>
                        <div className="muted small">{KIND_LABEL[p.kind]}</div>
                      </td>
                      <td>{p.teacher?.teacher_name || '—'}</td>
                      <td className="num mono">{p.readable ? `${p.total}/${p.max}` : '—'}</td>
                      <td>
                        <PaperBadges paper={p} />
                      </td>
                      <td className="muted nowrap">{fmtDateTime(p.checked_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="pager">
              <span className="muted">
                {fmtNumber(page * PAGE_SIZE + 1)}–{fmtNumber(Math.min(count, (page + 1) * PAGE_SIZE))} of {fmtNumber(count)}
              </span>
              <div className="pager-buttons">
                <button className="btn btn-sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0 || papers.loading}>
                  Previous
                </button>
                <span className="muted small">
                  Page {page + 1} of {pages}
                </span>
                <button
                  className="btn btn-sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page + 1 >= pages || papers.loading}
                >
                  Next
                </button>
              </div>
            </footer>
          </>
        )}
      </Card>

      <PaperModal id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function PaperBadges({ paper }: { paper: Pick<PaperDetail, 'readable' | 'pct' | 'edited' | 'demo'> }) {
  return (
    <div className="badges">
      {paper.readable ? (
        <Badge tone={ratingTone(paper.pct)}>
          {paper.pct}% · {descriptor(paper.pct)}
        </Badge>
      ) : (
        <Badge tone="warning">Unreadable</Badge>
      )}
      {paper.edited && <Badge>Corrected</Badge>}
      {paper.demo && <Badge>Demo</Badge>}
    </div>
  );
}

function PaperModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const paper = useAsync(() => (id ? fetchPaper(id) : Promise.resolve(null)), [id]);
  const p = paper.data && paper.data.id === id ? paper.data : null;

  return (
    <Modal open={!!id} onClose={onClose} wide title={p ? p.learner || 'Unnamed learner' : 'Paper'}>
      {paper.error ? (
        <ErrorBanner message={paper.error} onRetry={paper.reload} />
      ) : !p ? (
        <div className="loading-block"><Spinner /></div>
      ) : (
        <PaperDetailView p={p} />
      )}
    </Modal>
  );
}

function PaperDetailView({ p }: { p: PaperDetail }) {
  const d = p.details ?? {};
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []) as string[];
  const steps = (Array.isArray(d.steps) ? d.steps : []) as { work?: string; status?: string; comment?: string }[];
  const errors = (Array.isArray(d.errors) ? d.errors : []) as { wrong?: string; correct?: string; type?: string }[];

  return (
    <div className="stack">
      <div className="paper-head">
        <div>
          <div className="muted small">
            {[p.section, KIND_LABEL[p.kind], p.teacher?.teacher_name].filter(Boolean).join(' · ')}
          </div>
          <div className="strong">{p.item_title || 'Untitled item'}</div>
          <div className="muted small">
            Checked {fmtDateTime(p.checked_at)}
            {p.edited && p.edited_at ? ` · corrected ${fmtDateTime(p.edited_at)}` : ''}
          </div>
        </div>
        <div className="score">
          {p.readable ? (
            <>
              <span className="score-num">
                {p.total}
                <span className="muted">/{p.max}</span>
              </span>
              <PaperBadges paper={p} />
            </>
          ) : (
            <PaperBadges paper={p} />
          )}
        </div>
      </div>

      {!p.readable && p.issue && <div className="banner banner-warning">{p.issue}</div>}

      {p.question && (
        <Section title="Question">
          <p className="prewrap">{p.question}</p>
        </Section>
      )}

      {p.criteria?.length > 0 && (
        <Section title="Scores by criterion">
          <div className="table-wrap">
            <table className="table compact">
              <thead>
                <tr>
                  <th>Criterion</th>
                  <th className="num">Score</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {p.criteria.map((c, i) => (
                  <tr key={i}>
                    <td className="strong">{c.name}</td>
                    <td className="num mono nowrap">
                      {c.score}/{c.max}
                    </td>
                    <td>{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {p.feedback && (
        <Section title="Feedback to the learner">
          <p className="prewrap">{p.feedback}</p>
        </Section>
      )}

      <div className="grid-2">
        {list(p.strengths).length > 0 && (
          <Section title="Strengths">
            <ul className="bullets">{list(p.strengths).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Section>
        )}
        {list(p.improvements).length > 0 && (
          <Section title="To improve">
            <ul className="bullets">{list(p.improvements).map((s, i) => <li key={i}>{s}</li>)}</ul>
          </Section>
        )}
      </div>

      {p.kind === 'math' && steps.length > 0 && (
        <Section title="Solution steps">
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={i}>
                <Badge tone={s.status === 'correct' ? 'success' : s.status === 'error' ? 'danger' : 'warning'}>
                  {s.status === 'correct' ? '✓ Correct' : s.status === 'error' ? '✗ Error' : '? Unclear'}
                </Badge>
                <code className="mono">{s.work}</code>
                {s.comment && <span className="muted small">{s.comment}</span>}
              </li>
            ))}
          </ol>
          {typeof d.finalAnswer === 'string' && d.finalAnswer && (
            <p className="small">
              Final answer: <code className="mono">{d.finalAnswer}</code>{' '}
              {d.finalCorrect ? '(correct)' : typeof d.correctAnswer === 'string' && d.correctAnswer ? `(expected ${d.correctAnswer})` : ''}
            </p>
          )}
        </Section>
      )}

      {p.kind === 'essay' && errors.length > 0 && (
        <Section title="Language errors">
          <ul className="bullets">
            {errors.map((e, i) => (
              <li key={i}>
                <s>{e.wrong}</s> → <strong>{e.correct}</strong> {e.type && <span className="muted small">({e.type})</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.transcription && (
        <Section title="Transcription">
          <div className="lined prewrap">{p.transcription}</div>
        </Section>
      )}

      {p.note && (
        <Section title="Teacher's note">
          <p className="prewrap">{p.note}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
