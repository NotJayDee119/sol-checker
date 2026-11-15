import { useMemo, useState } from 'react';

import {
  Badge,
  Card,
  ConfirmDialog,
  Empty,
  ErrorBanner,
  Modal,
  PageHeader,
  Presence,
  Segmented,
  Spinner,
  type ConfirmRequest,
} from '../components/ui';
import { fetchTeachers, ONLINE_MINUTES, updateTeacher, type TeacherRow } from '../lib/api';
import { descriptor, fmtDateTime, fmtNumber, fmtRelative, ratingTone } from '../lib/format';
import { navigate, useAsync, useNow } from '../lib/hooks';

type Show = 'all' | 'online' | 'owners' | 'suspended' | 'inactive';

const SHOW_OPTIONS: { value: Show; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'inactive', label: 'Inactive 30+ days' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'owners', label: 'Owners' },
];

const INACTIVE_MS = 30 * 86_400_000;

export function Teachers({ me, initialShow }: { me: string; initialShow: string | null }) {
  const [show, setShow] = useState<Show>(
    SHOW_OPTIONS.some((o) => o.value === initialShow) ? (initialShow as Show) : 'all'
  );
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const teachers = useAsync(fetchTeachers, [], 30_000);
  const now = useNow();

  const all = teachers.data ?? [];
  const selected = all.find((t) => t.id === selectedId) ?? null;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      if (show === 'online' && !t.online) return false;
      if (show === 'owners' && !t.is_owner) return false;
      if (show === 'suspended' && !t.suspended) return false;
      if (show === 'inactive' && now - new Date(t.last_active).getTime() < INACTIVE_MS) return false;
      if (!q) return true;
      return [t.teacher_name, t.subject, t.email ?? ''].some((v) => v.toLowerCase().includes(q));
    });
  }, [all, show, search, now]);

  const onlineCount = all.filter((t) => t.online).length;

  const ask = (t: TeacherRow, action: 'owner' | 'suspend') => {
    const name = t.teacher_name || t.email || 'this teacher';
    if (action === 'owner') {
      const grant = !t.is_owner;
      setConfirm({
        title: grant ? `Make ${name} an owner?` : `Remove owner access from ${name}?`,
        body: grant ? (
          <p>
            Owners can open this dashboard, see <strong>every teacher's papers</strong>, and suspend accounts. Only give
            this to people who already oversee the teachers.
          </p>
        ) : (
          <p>{name} will only see their own papers again and will lose access to this dashboard.</p>
        ),
        confirmLabel: grant ? 'Make owner' : 'Remove owner access',
        danger: !grant,
        run: async () => {
          await updateTeacher(t.id, { isOwner: grant });
          teachers.reload();
        },
      });
    } else {
      const suspend = !t.suspended;
      setConfirm({
        title: suspend ? `Suspend ${name}?` : `Restore ${name}?`,
        body: suspend ? (
          <p>
            {name} will still be able to sign in and read their own records, but they <strong>can't check papers, save
            items or change results</strong> until you restore the account. Nothing is deleted.
          </p>
        ) : (
          <p>{name} will be able to check papers and save items again.</p>
        ),
        confirmLabel: suspend ? 'Suspend account' : 'Restore account',
        danger: suspend,
        run: async () => {
          await updateTeacher(t.id, { suspended: suspend });
          teachers.reload();
        },
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Teachers"
        subtitle={
          teachers.data
            ? `${fmtNumber(all.length)} teachers · ${fmtNumber(onlineCount)} online now (active in the last ${ONLINE_MINUTES} minutes)`
            : 'Loading teachers…'
        }
      >
        <button className="btn" onClick={teachers.reload} disabled={teachers.loading}>
          {teachers.loading ? <Spinner /> : 'Refresh'}
        </button>
      </PageHeader>

      {teachers.error && <ErrorBanner message={teachers.error} onRetry={teachers.reload} />}

      <div className="filters">
        <input
          className="input grow"
          type="search"
          placeholder="Search name, subject or email"
          aria-label="Search teachers"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Segmented label="Show" value={show} options={SHOW_OPTIONS} onChange={setShow} />
      </div>

      <Card className="flush">
        {!teachers.data ? (
          !teachers.error && <div className="loading-block"><Spinner /></div>
        ) : rows.length === 0 ? (
          <Empty title={all.length ? 'No teachers match these filters' : 'No teachers yet'}>
            {!all.length &&
              'A teacher appears here the first time they sign in to the SOL app. Their records sync to the database from then on.'}
          </Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Status</th>
                  <th className="num">Papers</th>
                  <th className="num">This week</th>
                  <th className="num">Items</th>
                  <th className="num">Average</th>
                  <th>Last check</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className={t.suspended ? 'is-dim' : ''}>
                    <td>
                      <div className="strong">
                        {t.teacher_name || <span className="muted">No name yet</span>}
                        {t.id === me && <span className="muted small"> (you)</span>}
                      </div>
                      <div className="muted small">{[t.subject, t.email].filter(Boolean).join(' · ') || '—'}</div>
                      <div className="badges">
                        {t.is_owner && <Badge tone="primary">Owner</Badge>}
                        {t.suspended && <Badge tone="danger">Suspended</Badge>}
                      </div>
                    </td>
                    <td>
                      <Presence online={t.online} label={t.online ? 'Online' : fmtRelative(t.last_active, now)} />
                    </td>
                    <td className="num">{fmtNumber(t.papers)}</td>
                    <td className="num">{fmtNumber(t.papers_7d)}</td>
                    <td className="num">{fmtNumber(t.items)}</td>
                    <td className="num">
                      {t.avg_pct == null ? '—' : <Badge tone={ratingTone(t.avg_pct)}>{t.avg_pct}%</Badge>}
                    </td>
                    <td className="muted">{fmtRelative(t.last_paper_at, now)}</td>
                    <td className="actions">
                      <button className="btn btn-sm" onClick={() => setSelectedId(t.id)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelectedId(null)} title={selected?.teacher_name || 'Teacher'}>
        {selected && (
          <div className="stack">
            <dl className="facts">
              <dt>Subject</dt>
              <dd>{selected.subject || '—'}</dd>
              <dt>Sign-in email</dt>
              <dd>{selected.email || '—'}</dd>
              <dt>Status</dt>
              <dd>
                <Presence online={selected.online} label={selected.online ? 'Online now' : `Last active ${fmtRelative(selected.last_active, now).toLowerCase()}`} />
              </dd>
              <dt>Last sign-in</dt>
              <dd>{fmtDateTime(selected.last_sign_in_at)}</dd>
              <dt>Joined</dt>
              <dd>{fmtDateTime(selected.created_at)}</dd>
              <dt>Papers checked</dt>
              <dd>
                {fmtNumber(selected.papers)} ({fmtNumber(selected.papers_7d)} this week)
              </dd>
              <dt>Saved items</dt>
              <dd>{fmtNumber(selected.items)}</dd>
              <dt>Average score</dt>
              <dd>{selected.avg_pct == null ? '—' : `${selected.avg_pct}% · ${descriptor(selected.avg_pct)}`}</dd>
            </dl>

            <div className="action-list">
              <button
                className="btn"
                onClick={() => navigate('papers', { teacher: selected.id, days: '0' })}
              >
                View their papers
              </button>
              <button className="btn" onClick={() => ask(selected, 'owner')} disabled={selected.id === me || selected.suspended}>
                {selected.is_owner ? 'Remove owner access' : 'Make owner'}
              </button>
              <button
                className={`btn ${selected.suspended ? '' : 'btn-danger-outline'}`}
                onClick={() => ask(selected, 'suspend')}
                disabled={selected.id === me || selected.is_owner}
              >
                {selected.suspended ? 'Restore account' : 'Suspend account'}
              </button>
            </div>
            {selected.id === me ? (
              <p className="footnote">You can't change your own access. Ask another owner.</p>
            ) : selected.is_owner ? (
              <p className="footnote">Remove owner access before suspending an owner.</p>
            ) : selected.suspended ? (
              <p className="footnote">Restore the account before making them an owner.</p>
            ) : null}
          </div>
        )}
      </Modal>

      <ConfirmDialog request={confirm} onDone={() => setConfirm(null)} />
    </>
  );
}
