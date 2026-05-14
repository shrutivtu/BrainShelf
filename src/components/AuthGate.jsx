import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient.js';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!supabase) return;
      setError('');
      setLoading(true);
      try {
        const fn = mode === 'signup' ? supabase.auth.signUp : supabase.auth.signInWithPassword;
        const { error: authErr } = await fn.call(supabase.auth, { email, password });
        if (authErr) throw authErr;
      } catch (err) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    },
    [mode, email, password]
  );

  if (session === undefined) {
    return (
      <div className="bs-root auth-loading">
        <p>Loading...</p>
      </div>
    );
  }

  if (!supabase) {
    return children({ session: null, userId: null, onSignOut: () => {} });
  }

  if (!session) {
    return (
      <div className="bs-root auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden>
              <rect x="8" y="12" width="32" height="6" rx="3" style={{ fill: 'var(--accent)' }} />
              <rect x="8" y="22" width="26" height="6" rx="3" style={{ fill: 'var(--ink-1)' }} />
              <rect x="8" y="32" width="20" height="6" rx="3" style={{ fill: 'var(--accent-soft-line)' }} />
            </svg>
            <span className="auth-brand__name">BrainShelf</span>
          </div>
          <p className="auth-tagline">A quiet place for your thoughts.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>

            <label className="auth-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />

            <label className="auth-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="auth-switch__btn"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
  const handleSignOut = () => supabase.auth.signOut();

  return children({ session, userId, onSignOut: handleSignOut });
}
