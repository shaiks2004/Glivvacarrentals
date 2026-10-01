import { useState } from 'react';
import type { FormEvent } from 'react';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';

export default function Login() {
  useMeta('Log In | Glivva Car Rentals', 'Log in to manage your bookings.');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: connect to your authentication API (e.g. Firebase Auth, Supabase or your own backend).
    setMsg('Authentication is not connected yet. Hook this form to your backend to enable accounts.');
  };
  return (
    <>
      <PageHead title={mode === 'in' ? 'Log in' : 'Create an account'} lead="Manage your bookings, documents and offers in one place." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap" style={{ maxWidth: 480 }}>
        {msg && <div className="ok" role="status">{msg}</div>}
        <form className="card" style={{ display: 'grid', gap: '1.1rem' }} onSubmit={submit}>
          {mode === 'up' && <label>Full name<input required autoComplete="name" /></label>}
          <label>Email or mobile<input required autoComplete="username" /></label>
          <label>Password<input type="password" required autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={6} /></label>
          <button className="btn gold" type="submit">{mode === 'in' ? 'Log in' : 'Sign up'}</button>
          <button type="button" className="btn" onClick={() => { setMode(m => (m === 'in' ? 'up' : 'in')); setMsg(''); }}>{mode === 'in' ? 'New here? Create an account' : 'Already have an account? Log in'}</button>
        </form>
      </div></section>
    </>
  );
}
