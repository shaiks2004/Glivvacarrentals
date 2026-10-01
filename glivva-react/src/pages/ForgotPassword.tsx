import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  useMeta('Reset Password | Glivva Car Rentals', 'Request a password reset link.');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Unable to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Reset your password"
        lead="Enter your registered email to receive password recovery instructions."
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
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>Recovery Link Sent</h3>
              <p style={{ color: 'var(--mute)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                We have sent instructions to <strong>{email}</strong>. Please check your inbox and spam folder.
              </p>
              <Link to="/login" className="btn gold" style={{ display: 'inline-block' }}>
                Return to Log in
              </Link>
            </div>
          ) : (
            <form
              className="card"
              style={{ display: 'grid', gap: '1.2rem' }}
              onSubmit={handleSubmit}
              noValidate
            >
              <label>
                Registered email address
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

              <button className="btn gold" type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Sending link...' : 'Send reset link'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.88rem' }}>
                <Link to="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                  ← Back to Log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
