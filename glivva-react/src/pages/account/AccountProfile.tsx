import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

export default function AccountProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError('Please provide your full name.');
      return;
    }

    if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          name: trimmedName,
          phone: trimmedPhone,
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      setSuccess('Profile updated successfully.');
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Profile Details</h2>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
          Manage your personal information and contact number for booking updates.
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

      <form onSubmit={handleSubmit} className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.75rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
            Email address (Login credential)
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--mute)',
              cursor: 'not-allowed',
            }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--mute)', marginTop: '0.25rem', display: 'block' }}>
            Email cannot be changed directly. Contact support for assistance.
          </span>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="profile-name" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
            Full name *
          </label>
          <input
            id="profile-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="e.g. Rahul Sharma"
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
          <label htmlFor="profile-phone" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
            Phone number (WhatsApp active) *
          </label>
          <input
            id="profile-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+91 98765 43210"
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

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-gold"
          >
            {loading ? 'Saving changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
