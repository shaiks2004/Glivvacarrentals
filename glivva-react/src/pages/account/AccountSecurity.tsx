import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function AccountSecurity() {
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: authErr } = await supabase.auth.updateUser({
        password,
      });

      if (authErr) throw authErr;

      setSuccess('Your password has been updated successfully.');
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Security & Credentials</h2>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
          Update your account password and manage your active login sessions.
        </p>
      </div>

      {success && (
        <div className="ok" role="status" style={{ marginBottom: '1.5rem' }}>
          {success}
        </div>
      )}

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Change Password Form */}
      <form onSubmit={handlePasswordChange} className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.75rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Change Account Password</h3>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="new-pwd" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
            New password *
          </label>
          <input
            id="new-pwd"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters (mixed case + number)"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="confirm-pwd" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
            Confirm new password *
          </label>
          <input
            id="confirm-pwd"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-gold"
        >
          {loading ? 'Updating password...' : 'Update Password'}
        </button>
      </form>

      {/* Sign Out Card */}
      <div className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Active Session</h3>
        <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Sign out of your account on this device to protect your personal details.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="btn"
          style={{ borderColor: 'var(--line)', color: '#f87171' }}
        >
          Sign out of account
        </button>
      </div>
    </div>
  );
}
