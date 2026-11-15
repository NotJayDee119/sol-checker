import { useState } from 'react';

import { DailyBars, HBars } from '../components/charts';
import { Badge, Card, Empty, ErrorBanner, PageHeader, Presence, Segmented, Spinner, StatTile } from '../components/ui';
import { fetchOverview, fetchTeachers, ONLINE_MINUTES } from '../lib/api';
import { BANDS, descriptor, fmtNumber, fmtPct, fmtRelative, KIND_LABEL, PASSING_PCT } from '../lib/format';
import { navigate, useAsync, useNow } from '../lib/hooks';

const PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

/** Online counts go stale fast, so the page refreshes itself every 30 s while visible. */
const POLL_MS = 30_000;

export function Overview() {
  const [days, setDays] = useState(30);
  const overview = useAsync(() => fetchOverview(days), [days], POLL_MS);
  const teachers = useAsync(fetchTeachers, [], POLL_MS);
  const now = useNow();

  const o = overview.data;
  const online = (teachers.data ?? []).filter((t) => t.online);
  const refresh = () => {
    overview.reload();
    teachers.reload();
  };

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={
          o ? <>Updated {fmtRelative(o.generated_at, now).toLowerCase()} · refreshes every 30 seconds</> : 'Loading the latest numbers…'
        }
      >
        <Segmented label="Period" value={days} options={PERIODS} onChange={setDays} />
        <button className="btn" onClick={refresh} disabled={overview.loading}>
          {overview.loading ? <Spinner /> : 'Refresh'}
        </button>
      </PageHeader>

      {overview.error && <ErrorBanner message={overview.error} onRetry={overview.reload} />}

      {!o ? (
        !overview.error && <div className="loading-block"><Spinner /></div>
      ) : (
        <>
          <div className="tiles">
            <StatTile
              tone="live"
              label="Online now"
              value={fmtNumber(o.teachers.online)}
              hint={`Active in the last ${ONLINE_MINUTES} minutes`}
            />
            <StatTile
              label="Active today"
              value={fmtNumber(o.teachers.active_today)}
              hint={`${fmtNumber(o.teachers.active_7d)} this week`}
            />
            <StatTile
              label="Teachers"
              value={fmtNumber(o.teachers.total)}
              hint={`${fmtNumber(o.teachers.new_period)} joined in ${days} days`}
            />
            <StatTile
              label={`Papers checked · ${days} days`}
              value={fmtNumber(o.papers.period)}
              hint={`${fmtNumber(o.papers.today)} today · ${fmtNumber(o.papers.total)} all time`}
            />
            <StatTile
              label="Average score"
              value={o.papers.avg_pct == null ? '—' : `${o.papers.avg_pct}%`}
              hint={o.papers.avg_pct == null ? 'No scored papers yet' : descriptor(o.papers.avg_pct)}
            />
            <StatTile
              label={`At or above ${PASSING_PCT}%`}
              value={fmtPct(o.papers.passing, o.papers.scored)}
              hint={`${fmtNumber(o.papers.passing)} of ${fmtNumber(o.papers.scored)} scored papers`}
            />
          </div>

          <div className="grid-2-1">
            <Card title={`Papers checked per day`}>
              {o.papers.period === 0 ? (
                <Empty title={`No papers checked in the last ${days} days`}>
                  Papers appear here once teachers' apps sync results to the database.
                </Empty>
              ) : (
                <DailyBars data={o.by_day.map((d) => ({ day: d.day, value: d.papers }))} unit={['paper', 'papers']} />
              )}
            </Card>

            <Card
              title={
                <>
                  Online now <span className="count">{online.length}</span>
                </>
              }
              action={
                <button className="link" onClick={() => navigate('teachers')}>
                  All teachers
                </button>
              }
            >
              {teachers.error ? (
                <ErrorBanner message={teachers.error} onRetry={teachers.reload} />
              ) : online.length === 0 ? (
                <Empty title="Nobody is online right now">
                  {teachers.data?.length ? (
                    <>Last seen: {teachers.data[0].teacher_name || 'Unnamed teacher'}, {fmtRelative(teachers.data[0].last_active, now).toLowerCase()}.</>
                  ) : (
                    'No teachers have signed in yet.'
                  )}
                </Empty>
              ) : (
                <ul className="people">
                  {online.map((t) => (
                    <li key={t.id}>
                      <div>
                        <div className="strong">{t.teacher_name || 'Unnamed teacher'}</div>
                        <div className="muted small">{t.subject || '—'}</div>
                      </div>
                      <Presence online label={fmtRelative(t.last_active, now)} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="grid-3">
            <Card title="Scores by rating">
              {o.papers.scored === 0 ? (
                <Empty title="No scored papers in this period" />
              ) : (
                <HBars
                  max={Math.max(...BANDS.map((b) => o.bands[b.key]))}
                  rows={BANDS.map((b) => ({
                    key: b.key,
                    label: b.label,
                    sub: b.range,
                    value: o.bands[b.key],
                    display: (
                      <>
                        {fmtNumber(o.bands[b.key])} <span className="muted">{fmtPct(o.bands[b.key], o.papers.scored)}</span>
                      </>
                    ),
                    onClick: () => navigate('papers', { status: b.key, days: String(days) }),
                  }))}
                />
              )}
              <p className="footnote">Demo results and unreadable photos are left out of scores.</p>
            </Card>

            <Card title="By item type">
              {o.by_kind.length === 0 ? (
                <Empty title="No papers in this period" />
              ) : (
                <HBars
                  rows={o.by_kind.map((k) => ({
                    key: k.kind,
                    label: KIND_LABEL[k.kind],
                    sub: k.avg_pct == null ? 'No scores' : `Average ${k.avg_pct}%`,
                    value: k.papers,
                    onClick: () => navigate('papers', { kind: k.kind, days: String(days) }),
                  }))}
                />
              )}
            </Card>

            <Card title="Most papers checked">
              {o.top_teachers.length === 0 ? (
                <Empty title="No papers in this period" />
              ) : (
                <HBars
                  rows={o.top_teachers.map((t) => ({
                    key: t.id,
                    label: t.name || 'Unnamed teacher',
                    value: t.papers,
                    onClick: () => navigate('papers', { teacher: t.id, days: String(days) }),
                  }))}
                />
              )}
            </Card>
          </div>

          <Card title="Needs attention">
            <ul className="attention">
              <Attention
                count={o.papers.unreadable}
                label="unreadable photos"
                detail={`in ${days} days — teachers had to retake these`}
                onClick={() => navigate('papers', { status: 'unreadable', days: String(days) })}
              />
              <Attention
                count={o.papers.edited}
                label="scores corrected by teachers"
                detail={`in ${days} days (${fmtPct(o.papers.edited, o.papers.period)} of papers)`}
                onClick={() => navigate('papers', { status: 'edited', days: String(days) })}
              />
              <Attention
                count={o.papers.demo}
                label="demo papers"
                detail="simulated results; safe to clear in Maintenance"
                onClick={() => navigate('maintenance')}
              />
              <Attention
                count={o.teachers.suspended}
                label="suspended accounts"
                detail="can read their records but not check papers"
                onClick={() => navigate('teachers', { show: 'suspended' })}
              />
            </ul>
          </Card>
        </>
      )}
    </>
  );
}

function Attention({ count, label, detail, onClick }: { count: number; label: string; detail: string; onClick: () => void }) {
  return (
    <li>
      <button className="attention-row" onClick={onClick}>
        <Badge tone={count === 0 ? 'neutral' : 'warning'}>{fmtNumber(count)}</Badge>
        <span>
          <span className="strong">{label}</span> <span className="muted">{detail}</span>
        </span>
        <span className="chev" aria-hidden>
          ›
        </span>
      </button>
    </li>
  );
}
