import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function ChangePassword() {
  useMeta('Change Temporary Password | Glivva', 'Set a permanent password on first login.');
  const navigate = useNavigate();
  const { role, refreshProfile } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
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
      // 1. Update auth password
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // 2. Clear must_change_password flag on profile
      if (authData.user) {
        await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', authData.user.id);

        await refreshProfile();
      }

      // 3. Redirect to role dashboard
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'employee') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/account', { replace: true });
      }
    } catch {
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Security update required"
        lead="Your account was provisioned with a temporary password. Please choose a permanent secure password to continue."
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
          >
            <label>
              New permanent password
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
              {loading ? 'Saving new password...' : 'Set permanent password & continue'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
