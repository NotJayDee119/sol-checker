import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type ReactNode } from 'react';

import { ErrorBanner, Spinner } from './components/ui';
import { isOwner } from './lib/api';
import { navigate, useAsync, useRoute, type Page } from './lib/hooks';
import { configError, supabase } from './lib/supabase';
import { Brand, Login } from './pages/Login';
import { Maintenance } from './pages/Maintenance';
import { Overview } from './pages/Overview';
import { Papers } from './pages/Papers';
import { Teachers } from './pages/Teachers';

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (configError) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (configError) {
    return (
      <Centered>
        <Brand />
        <h1>Supabase isn't configured</h1>
        <p className="muted">{configError}</p>
      </Centered>
    );
  }
  if (session === undefined) return <Centered><Spinner /></Centered>;
  if (!session) return <Login />;
  return <OwnerGate session={session} />;
}

/** Signed in is not enough: the account must be an owner (teachers.is_owner). */
function OwnerGate({ session }: { session: Session }) {
  const userId = session.user.id;
  const owner = useAsync(() => isOwner(userId), [userId]);

  if (owner.loading && owner.data === undefined) return <Centered><Spinner /></Centered>;
  if (owner.error) {
    return (
      <Centered>
        <Brand />
        <ErrorBanner message={owner.error} onRetry={owner.reload} />
        <SignOut />
      </Centered>
    );
  }
  if (!owner.data) {
    return (
      <Centered>
        <Brand />
        <h1>This account isn't an owner</h1>
        <p className="muted">
          You're signed in as <strong>{session.user.email}</strong>, but only SOL owners can open the admin dashboard.
          An existing owner can give you access from the Teachers page.
        </p>
        <SignOut />
      </Centered>
    );
  }
  return <Shell session={session} />;
}

const NAV: { page: Page; label: string; icon: string }[] = [
  { page: 'overview', label: 'Overview', icon: '◔' },
  { page: 'teachers', label: 'Teachers', icon: '☺' },
  { page: 'papers', label: 'Papers', icon: '☰' },
  { page: 'maintenance', label: 'Maintenance', icon: '⚙' },
];

function Shell({ session }: { session: Session }) {
  const { page, params } = useRoute();

  useEffect(() => {
    document.title = `${NAV.find((n) => n.page === page)?.label ?? 'Admin'} · SOL Admin`;
  }, [page]);

  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Admin">
          {NAV.map((n) => (
            <a
              key={n.page}
              href={`#/${n.page}`}
              className={n.page === page ? 'is-active' : ''}
              aria-current={n.page === page ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="small" title={session.user.email}>
            {session.user.email}
          </div>
          <SignOut />
        </div>
      </aside>
      <main id="main" className="main">
        {page === 'overview' && <Overview />}
        {page === 'teachers' && <Teachers me={session.user.id} initialShow={params.get('show')} key={params.toString()} />}
        {page === 'papers' && <Papers params={params} />}
        {page === 'maintenance' && <Maintenance />}
      </main>
    </div>
  );
}

function SignOut() {
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={async () => {
        await supabase.auth.signOut();
        navigate('overview');
      }}
    >
      Sign out
    </button>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-card">{children}</div>
    </main>
  );
}
