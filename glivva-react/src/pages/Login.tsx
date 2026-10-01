import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function Login() {
  useMeta('Log In | Glivva Car Rentals', 'Log in to manage your bookings and account.');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, mustChangePassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect based on role
  if (user && role) {
    if (mustChangePassword) {
      navigate('/change-password', { replace: true });
    } else if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (role === 'employee') {
      navigate('/staff', { replace: true });
    } else {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/account';
      navigate(from, { replace: true });
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch profile to determine role and forced password change
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, must_change_password')
          .eq('id', data.user.id)
          .single();

        const userRole = profile?.role || 'user';
        const needsPasswordChange = Boolean(profile?.must_change_password);

        if (needsPasswordChange) {
          navigate('/change-password', { replace: true });
        } else if (userRole === 'admin') {
          navigate('/admin', { replace: true });
        } else if (userRole === 'employee') {
          navigate('/staff', { replace: true });
        } else {
          const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/account';
          navigate(from, { replace: true });
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Log in"
        lead="Manage your bookings, documents and offers in one place."
      />
      <section style={{ paddingTop: '1.5rem' }}>
        <div className="wrap" style={{ maxWidth: 440 }}>
          {error && (
            <div
              className="err"
              role="alert"
              style={{
                border: '1px solid #ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
                borderRadius: 'var(--r)',
                padding: '1rem',
                marginBottom: '1.2rem',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <form
            className="card"
            style={{ display: 'grid', gap: '1.2rem' }}
            onSubmit={handleSubmit}
            noValidate
          >
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={loading}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                minLength={6}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.4rem' }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: '0.8rem', color: 'var(--gold)', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </div>

            <button className="btn gold" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--mute)' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                Sign up
              </Link>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
