import { useState, type FormEvent } from 'react';

import { ErrorBanner } from '../components/ui';
import { supabase } from '../lib/supabase';

/**
 * Supabase sign-in needs an email, so a plain username ("admin") is mapped to a
 * placeholder address on this domain. Accounts with real emails still work as typed.
 */
const USERNAME_DOMAIN = 'sol.local';

function toLoginEmail(input: string) {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${USERNAME_DOMAIN}`;
}

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: toLoginEmail(username), password });
    // Same message for a wrong username or password, so the form doesn't reveal who has an account.
    if (error) setError(error.status === 400 ? 'Wrong username or password.' : error.message);
    setBusy(false);
  };

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <Brand />
        <h1>Sign in to the admin dashboard</h1>
        <p className="muted">For SOL owners only. Teachers use the SOL app.</p>
        {error && <ErrorBanner message={error} />}
        <label className="field">
          <span>Username or email</span>
          <input
            className="input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <img className="brand-mark" src="/logo.png" alt="" aria-hidden />
      <span className="brand-name">SOL</span>
      <span className="brand-tag">Admin</span>
    </div>
  );
}
