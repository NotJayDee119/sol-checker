import { useState, type ReactNode } from 'react';

import { Card, ConfirmDialog, ErrorBanner, PageHeader, Spinner, type ConfirmRequest } from '../components/ui';
import { EMPTY_FILTERS, fetchOverview, fetchPapersForExport, fetchTeachers, purgePapers } from '../lib/api';
import { downloadCsv } from '../lib/csv';
import { fmtDate, fmtNumber, isoDay, plural } from '../lib/format';
import { errorMessage, navigate, useAsync, useNow } from '../lib/hooks';

const INACTIVE_MS = 30 * 86_400_000;

function defaultCutoff() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return isoDay(d);
}

export function Maintenance() {
  const overview = useAsync(() => fetchOverview(30), []);
  const teachers = useAsync(fetchTeachers, []);
  const now = useNow(60_000);

  const [cutoff, setCutoff] = useState(defaultCutoff);
  const cutoffDate = new Date(`${cutoff}T00:00:00`);
  const cutoffValid = !Number.isNaN(cutoffDate.getTime()) && cutoffDate.getTime() <= Date.now();

  const demoCount = useAsync(() => purgePapers(new Date(), { demoOnly: true, dryRun: true }), []);
  const oldCount = useAsync(
    () => (cutoffValid ? purgePapers(cutoffDate, { demoOnly: false, dryRun: true }) : Promise.resolve(0)),
    [cutoff]
  );

  const [exported, setExported] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [typed, setTyped] = useState('');
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [done, setDone] = useState('');

  const o = overview.data;
  const inactive = (teachers.data ?? []).filter((t) => now - new Date(t.last_active).getTime() >= INACTIVE_MS);
  const unnamed = (teachers.data ?? []).filter((t) => !t.teacher_name.trim());

  const refreshAll = () => {
    overview.reload();
    demoCount.reload();
    oldCount.reload();
  };

  const exportOld = async () => {
    setExporting(true);
    setExportError('');
    try {
      const rows = await fetchPapersForExport({ ...EMPTY_FILTERS, days: 0, before: cutoffDate.toISOString() });
      downloadCsv(rows, `sol-archive-before-${cutoff}.csv`);
      setExported(cutoff);
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const askClearDemo = () =>
    setConfirm({
      title: `Delete ${fmtNumber(demoCount.data ?? 0)} demo papers?`,
      body: (
        <p>
          Demo papers hold simulated results made while the checking service was not connected. They are not real
          scores. This can't be undone.
        </p>
      ),
      confirmLabel: 'Delete demo papers',
      danger: true,
      run: async () => {
        const n = await purgePapers(new Date(), { demoOnly: true, dryRun: false });
        setDone(`Deleted ${fmtNumber(n)} demo papers.`);
        refreshAll();
      },
    });

  const askPurgeOld = () =>
    setConfirm({
      title: `Delete ${fmtNumber(oldCount.data ?? 0)} papers checked before ${fmtDate(cutoffDate.toISOString())}?`,
      body: (
        <p>
          These papers will be removed for <strong>every teacher</strong>. Keep the archive CSV you just
          downloaded; it is the only copy the dashboard can give you. This can't be undone.
        </p>
      ),
      confirmLabel: 'Delete papers',
      danger: true,
      run: async () => {
        const n = await purgePapers(cutoffDate, { demoOnly: false, dryRun: false });
        setDone(`Deleted ${fmtNumber(n)} papers checked before ${fmtDate(cutoffDate.toISOString())}.`);
        setTyped('');
        setExported(null);
        refreshAll();
      },
    });

  return (
    <>
      <PageHeader title="Maintenance" subtitle="Keep the database tidy and check that the app is reporting in.">
        <button className="btn" onClick={refreshAll} disabled={overview.loading}>
          {overview.loading ? <Spinner /> : 'Refresh'}
        </button>
      </PageHeader>

      {done && (
        <div className="banner banner-success" role="status">
          <span>{done}</span>
          <button className="btn btn-sm" onClick={() => setDone('')}>
            Dismiss
          </button>
        </div>
      )}
      {overview.error && <ErrorBanner message={overview.error} onRetry={overview.reload} />}

      <div className="grid-2">
        <Card title="Database">
          {!o ? (
            <div className="loading-block"><Spinner /></div>
          ) : (
            <dl className="facts">
              <dt>Teachers</dt>
              <dd className="mono">{fmtNumber(o.teachers.total)}</dd>
              <dt>Owners</dt>
              <dd className="mono">{fmtNumber(o.teachers.owners)}</dd>
              <dt>Saved items</dt>
              <dd className="mono">{fmtNumber(o.items)}</dd>
              <dt>Checked papers</dt>
              <dd className="mono">{fmtNumber(o.papers.total)}</dd>
              <dt>Demo papers</dt>
              <dd className="mono">{fmtNumber(o.papers.demo)}</dd>
            </dl>
          )}
          <p className="footnote">Photos are never stored, only results (spec §9).</p>
        </Card>

        <Card title="Health checks">
          <ul className="checks">
            <Check
              ok={(o?.teachers.total ?? 0) > 0}
              okText="Teachers are signing in to the app."
              badText="No teacher has signed in yet. Online status and analytics fill in once the app syncs to the database."
            />
            <Check
              ok={(o?.teachers.active_7d ?? 0) > 0}
              okText={`${plural(o?.teachers.active_7d ?? 0, 'teacher was', 'teachers were')} active in the last 7 days.`}
              badText="No app activity in the last 7 days. If teachers are using SOL, check that the app sends its heartbeat."
            />
            <Check
              ok={inactive.length === 0}
              okText="No accounts have been idle for 30+ days."
              badText={
                <>
                  {plural(inactive.length, 'account', 'accounts')} idle for 30+ days.{' '}
                  <button className="link" onClick={() => navigate('teachers', { show: 'inactive' })}>
                    Review
                  </button>
                </>
              }
            />
            <Check
              ok={unnamed.length === 0}
              okText="Every teacher has typed their name."
              badText={`${plural(unnamed.length, "teacher hasn't", "teachers haven't")} typed their name yet; they show as "No name yet".`}
            />
            <Check
              ok={(o?.teachers.owners ?? 0) >= 2}
              okText="More than one owner, so you can't get locked out."
              badText="You are the only owner. Consider making a second, trusted person an owner as a backup."
            />
          </ul>
        </Card>
      </div>

      <Card title="Clear demo papers">
        <div className="maint-row">
          <p>
            Demo papers are simulated results made while the checking service was not connected. They are already left
            out of the score analytics.
          </p>
          <button
            className="btn btn-danger-outline"
            onClick={askClearDemo}
            disabled={!demoCount.data}
          >
            {demoCount.loading ? 'Counting…' : `Delete ${fmtNumber(demoCount.data ?? 0)} demo papers`}
          </button>
        </div>
      </Card>

      <Card title="Archive old papers">
        <p>
          SOL's plan (spec §7.5) is to export a CSV each quarter and then delete old papers. Download the archive first:
          the delete button unlocks only after you do.
        </p>
        <div className="archive">
          <label className="field">
            <span>Papers checked before</span>
            <input
              className="input"
              type="date"
              value={cutoff}
              max={isoDay()}
              onChange={(e) => {
                setCutoff(e.target.value);
                setTyped('');
              }}
            />
          </label>
          <div className="archive-count">
            {!cutoffValid ? (
              <span className="muted">Pick a date that isn't in the future.</span>
            ) : oldCount.loading ? (
              <Spinner />
            ) : (
              <>
                <span className="tile-value">{fmtNumber(oldCount.data ?? 0)}</span>
                <span className="muted"> papers</span>
              </>
            )}
          </div>
        </div>

        {exportError && <ErrorBanner message={exportError} />}
        {oldCount.error && <ErrorBanner message={oldCount.error} onRetry={oldCount.reload} />}

        <ol className="archive-steps">
          <li>
            <button className="btn" onClick={exportOld} disabled={!cutoffValid || !oldCount.data || exporting}>
              {exporting ? 'Preparing…' : '1. Download archive CSV'}
            </button>
            {exported === cutoff && <span className="ok-text">Downloaded</span>}
          </li>
          <li>
            <label className="field inline">
              <span>
                2. Type <strong className="mono">DELETE</strong> to confirm
              </span>
              <input
                className="input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={exported !== cutoff}
                autoComplete="off"
              />
            </label>
            <button
              className="btn btn-danger"
              onClick={askPurgeOld}
              disabled={exported !== cutoff || typed !== 'DELETE' || !oldCount.data}
            >
              3. Delete {fmtNumber(oldCount.data ?? 0)} papers
            </button>
          </li>
        </ol>
      </Card>

      <ConfirmDialog request={confirm} onDone={() => setConfirm(null)} />
    </>
  );
}

function Check({ ok, okText, badText }: { ok: boolean; okText: ReactNode; badText: ReactNode }) {
  return (
    <li className={ok ? 'check-ok' : 'check-warn'}>
      <span className="check-icon" aria-hidden>
        {ok ? '✓' : '!'}
      </span>
      <span>
        <span className="sr-only">{ok ? 'OK: ' : 'Needs attention: '}</span>
        {ok ? okText : badText}
      </span>
    </li>
  );
}
