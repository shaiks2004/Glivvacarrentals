import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Offer {
  id: number;
  code: string;
  title: string | null;
  description: string | null;
  percent_off: number | null;
  active: boolean;
  archived_at: string | null;
}

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPercent, setFormPercent] = useState(15);
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchOffers = async () => {
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('offers')
        .select('*')
        .order('id', { ascending: false });

      if (fetchErr) throw fetchErr;
      setOffers(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load offers.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const openAddModal = () => {
    setEditingOffer(null);
    setFormCode('');
    setFormTitle('');
    setFormPercent(15);
    setFormDescription('');
    setFormActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setFormCode(offer.code);
    setFormTitle(offer.title || '');
    setFormPercent(offer.percent_off || 15);
    setFormDescription(offer.description || '');
    setFormActive(offer.active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      setModalError('Promo code is required.');
      return;
    }

    if (formPercent < 1 || formPercent > 100) {
      setModalError('Discount percentage must be between 1 and 100.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      if (editingOffer) {
        const { error: updErr } = await supabase
          .from('offers')
          .update({
            code: cleanCode,
            title: formTitle.trim() || null,
            percent_off: formPercent,
            description: formDescription.trim() || null,
            active: formActive,
          })
          .eq('id', editingOffer.id);

        if (updErr) throw updErr;
        setSuccess(`Offer ${cleanCode} updated successfully.`);
      } else {
        const { error: insErr } = await supabase.from('offers').insert({
          code: cleanCode,
          title: formTitle.trim() || null,
          percent_off: formPercent,
          description: formDescription.trim() || null,
          active: formActive,
        });

        if (insErr) throw insErr;
        setSuccess(`New promo code ${cleanCode} created.`);
      }

      setIsModalOpen(false);
      await fetchOffers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save offer.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleActive = async (offer: Offer) => {
    setError(null);
    try {
      const nextActive = !offer.active;
      const { error: updErr } = await supabase
        .from('offers')
        .update({ active: nextActive, archived_at: nextActive ? null : new Date().toISOString() })
        .eq('id', offer.id);

      if (updErr) throw updErr;
      setSuccess(`Promo code ${offer.code} is now ${nextActive ? 'Active' : 'Paused'}.`);
      await fetchOffers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update offer status.';
      setError(msg);
    }
  };

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Pricing & Promotional Offers</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Manage discount voucher codes, seasonal promotions, and dynamic rental percentage rates.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>➕</span>
          <span>Create New Promo Offer</span>
        </button>
      </div>

      {success && (
        <div className="ok" role="status" style={{ marginBottom: '1.25rem' }}>
          {success}
        </div>
      )}

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Offers Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading promotional offers...
        </div>
      ) : offers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          No promotional offers created yet.
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--mute)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Promo Code</th>
                <th style={{ padding: '0.85rem 1rem' }}>Discount</th>
                <th style={{ padding: '0.85rem 1rem' }}>Campaign Title</th>
                <th style={{ padding: '0.85rem 1rem' }}>Description</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(226,172,47,0.15)',
                        color: 'var(--gold)',
                        border: '1px dashed var(--gold)',
                      }}
                    >
                      {offer.code}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#4ade80', fontSize: '1rem' }}>
                    {offer.percent_off}% OFF
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{offer.title || 'Untitled Offer'}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--mute)', maxWidth: '300px' }}>
                    {offer.description || 'No description'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: offer.active ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
                        color: offer.active ? '#4ade80' : 'var(--mute)',
                        fontWeight: 600,
                      }}
                    >
                      {offer.active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openEditModal(offer)}
                        className="btn btn-sm"
                        style={{ background: 'var(--bg)', borderColor: 'var(--line)', fontSize: '0.75rem' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(offer)}
                        className="btn btn-sm"
                        style={{
                          background: 'transparent',
                          borderColor: 'var(--line)',
                          color: offer.active ? 'var(--mute)' : '#4ade80',
                          fontSize: '0.75rem',
                        }}
                      >
                        {offer.active ? 'Pause' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Offer Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="offer-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                {editingOffer ? `Edit Offer ${editingOffer.code}` : 'Create Promotional Offer'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="grid g2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MONSOON25"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Discount Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formPercent}
                    onChange={(e) => setFormPercent(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Campaign Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Getaway Special"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Description / Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Applicable on all SUV bookings exceeding 3 days rental."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="offer-active-chk"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <label htmlFor="offer-active-chk" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Enable promo code for customer checkout
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={modalLoading} className="btn btn-primary">
                  {modalLoading ? 'Saving...' : editingOffer ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
