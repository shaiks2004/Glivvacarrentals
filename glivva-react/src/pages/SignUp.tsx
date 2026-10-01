import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  useMeta('Sign Up | Glivva Car Rentals', 'Create a new account to book self-drive cars.');
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        // Logged in immediately (email confirmations disabled locally)
        navigate('/account', { replace: true });
      } else {
        setSuccessMsg(
          'Account created successfully! If email verification is enabled, please check your inbox to confirm your account.'
        );
      }
    } catch {
      setError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Create an account"
        lead="Manage bookings, verify driving documents, and unlock member rates."
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

          {successMsg && (
            <div
              className="ok"
              role="status"
              style={{
                border: '1px solid var(--gold)',
                backgroundColor: 'rgba(226, 172, 47, 0.08)',
                borderRadius: 'var(--r)',
                padding: '1.2rem',
                marginBottom: '1.2rem',
                fontSize: '0.9rem',
                color: 'var(--text)',
              }}
            >
              {successMsg}
            </div>
          )}

          <form
            className="card"
            style={{ display: 'grid', gap: '1.2rem' }}
            onSubmit={handleSubmit}
            noValidate
          >
            <label>
              Full name
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                disabled={loading}
              />
            </label>

            <label>
              Mobile number (optional)
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                disabled={loading}
              />
            </label>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                disabled={loading}
              />
            </label>

            <button className="btn gold" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--mute)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                Log in
              </Link>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
