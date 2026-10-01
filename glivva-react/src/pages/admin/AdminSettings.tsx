import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface SiteSettingRow {
  key: string;
  value: unknown;
}

interface Review {
  id: number;
  booking_id: string | null;
  rating: number;
  body: string | null;
  approved: boolean;
  booking?: { ref: string } | null;
}

export default function AdminSettings() {
  // Settings Form State
  const [phone, setPhone] = useState('+91 92968 79793');
  const [whatsapp, setWhatsapp] = useState('9296879793');
  const [hours, setHours] = useState('Open daily, 7 am to 10 pm');
  const [gstPercent, setGstPercent] = useState(18);
  const [slaMinutes, setSlaMinutes] = useState(15);
  const [depositRules, setDepositRules] = useState('Confirmed by the team before pickup.');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Reviews Moderation State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsSuccess, setReviewsSuccess] = useState<string | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const fetchSettingsAndReviews = async () => {
    // 1. Fetch Site Settings
    try {
      const { data: sData, error: sErr } = await supabase.from('site_settings').select('*');
      if (sErr) throw sErr;

      (sData || []).forEach((row: SiteSettingRow) => {
        if (row.key === 'phone' && typeof row.value === 'string') setPhone(row.value);
        if (row.key === 'whatsapp' && typeof row.value === 'string') setWhatsapp(row.value);
        if (row.key === 'hours' && typeof row.value === 'string') setHours(row.value);
        if (row.key === 'gst_percent' && typeof row.value === 'number') setGstPercent(row.value);
        if (row.key === 'sla_minutes' && typeof row.value === 'number') setSlaMinutes(row.value);
        if (row.key === 'deposit_rules' && typeof row.value === 'string') setDepositRules(row.value);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load site settings.';
      setSettingsError(msg);
    } finally {
      setSettingsLoading(false);
    }

    // 2. Fetch Customer Reviews
    try {
      const { data: rData, error: rErr } = await supabase
        .from('reviews')
        .select(`
          id,
          booking_id,
          rating,
          body,
          approved,
          booking:bookings(ref)
        `)
        .order('id', { ascending: false });

      if (rErr) throw rErr;

      const formatted: Review[] = (rData || []).map((r) => {
        const bData = r.booking as unknown as { ref: string } | { ref: string }[] | null;
        return {
          ...r,
          booking: Array.isArray(bData) ? bData[0] : bData,
        };
      });

      setReviews(formatted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load customer reviews.';
      setReviewsError(msg);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndReviews();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    try {
      const updates = [
        { key: 'phone', value: phone.trim() },
        { key: 'whatsapp', value: whatsapp.trim() },
        { key: 'hours', value: hours.trim() },
        { key: 'gst_percent', value: Number(gstPercent) },
        { key: 'sla_minutes', value: Number(slaMinutes) },
        { key: 'deposit_rules', value: depositRules.trim() },
      ];

      for (const item of updates) {
        const { error: updErr } = await supabase
          .from('site_settings')
          .upsert({ key: item.key, value: item.value }, { onConflict: 'key' });

        if (updErr) throw updErr;
      }

      setSettingsSuccess('Operational settings updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings.';
      setSettingsError(msg);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleToggleReviewApproval = async (review: Review) => {
    setReviewsError(null);
    try {
      const nextApproved = !review.approved;
      const { error: updErr } = await supabase
        .from('reviews')
        .update({ approved: nextApproved })
        .eq('id', review.id);

      if (updErr) throw updErr;

      setReviewsSuccess(`Review #${review.id} is now ${nextApproved ? 'Approved & Visible' : 'Hidden'}.`);
      await fetchSettingsAndReviews();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update review status.';
      setReviewsError(msg);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    setReviewsError(null);
    try {
      const { error: delErr } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (delErr) throw delErr;

      setReviewsSuccess(`Review #${reviewId} deleted.`);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete review.';
      setReviewsError(msg);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Site Settings & Moderation</h2>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
          Configure operational parameters, contact helplines, SLA benchmarks, and moderate customer testimonials.
        </p>
      </div>

      <div className="grid g2" style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Operational Site Settings */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Operational Rules & Parameters</h3>

          {settingsSuccess && (
            <div className="ok" role="status" style={{ marginBottom: '1rem' }}>
              {settingsSuccess}
            </div>
          )}

          {settingsError && (
            <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
              {settingsError}
            </div>
          )}

          {settingsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mute)' }}>Loading settings...</div>
          ) : (
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Support Hotline Phone *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  WhatsApp Support Number *
                </label>
                <input
                  type="text"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Operating Desk Schedule *
                </label>
                <input
                  type="text"
                  required
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div className="grid g2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                    GST Rate (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                    Call SLA Target (mins) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={slaMinutes}
                    onChange={(e) => setSlaMinutes(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Security Deposit Rule Note
                </label>
                <textarea
                  rows={2}
                  value={depositRules}
                  onChange={(e) => setDepositRules(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <button type="submit" disabled={settingsSaving} className="btn btn-primary">
                  {settingsSaving ? 'Saving...' : 'Save Operational Settings'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Customer Reviews Moderation */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Customer Review Moderation</h3>

          {reviewsSuccess && (
            <div className="ok" role="status" style={{ marginBottom: '1rem' }}>
              {reviewsSuccess}
            </div>
          )}

          {reviewsError && (
            <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
              {reviewsError}
            </div>
          )}

          {reviewsLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mute)' }}>Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mute)' }}>
              No customer reviews submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '520px', overflowY: 'auto' }}>
              {reviews.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '0.85rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                      </span>
                      {r.booking?.ref && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--mute)', fontFamily: 'monospace' }}>
                          ({r.booking.ref})
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: r.approved ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                        color: r.approved ? '#4ade80' : '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      {r.approved ? 'Approved' : 'Pending Moderation'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', margin: '0.35rem 0', color: 'var(--text)' }}>
                    {r.body || 'No review text provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => handleToggleReviewApproval(r)}
                      className="btn btn-sm"
                      style={{
                        background: 'var(--card)',
                        borderColor: 'var(--line)',
                        fontSize: '0.75rem',
                        color: r.approved ? 'var(--mute)' : '#4ade80',
                      }}
                    >
                      {r.approved ? 'Unapprove' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="btn btn-sm"
                      style={{ background: 'transparent', borderColor: 'var(--line)', color: '#f87171', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
