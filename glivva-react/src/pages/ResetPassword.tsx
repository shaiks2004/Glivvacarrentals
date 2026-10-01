import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  useMeta('Set New Password | Glivva Car Rentals', 'Set a new password for your account.');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/account', { replace: true });
      }, 2000);
    } catch {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Set new password"
        lead="Choose a strong password with at least 6 characters."
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

          {success ? (
            <div
              className="ok"
              role="status"
              style={{
                border: '1px solid var(--gold)',
                backgroundColor: 'rgba(226, 172, 47, 0.08)',
                borderRadius: 'var(--r)',
                padding: '1.5rem',
                textAlign: 'center',
              }}
            >
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>Password Updated!</h3>
              <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
                Redirecting to your account dashboard...
              </p>
            </div>
          ) : (
            <form
              className="card"
              style={{ display: 'grid', gap: '1.2rem' }}
              onSubmit={handleSubmit}
            >
              <label>
                New password
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  disabled={loading}
                />
              </label>

              <label>
                Confirm new password
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  minLength={6}
                  disabled={loading}
                />
              </label>

              <button className="btn gold" type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Updating password...' : 'Update password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                  Return to Log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
