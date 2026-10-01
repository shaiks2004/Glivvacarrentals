import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { inr, formatDateTimeIST } from '../../lib/format';

interface StaffBooking {
  id: string;
  ref: string;
  user_id: string;
  pickup_place: string;
  period: string;
  driver_option: string;
  addons: Array<{ key: string; label: string; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  customer?: { name: string; phone: string } | null;
  car?: { name: string; slug: string; category: string } | null;
  handover_records?: Array<{
    id: string;
    type: 'pickup' | 'return';
    odometer: number;
    fuel: number;
    notes: string | null;
    created_at: string;
  }>;
}

export default function StaffBookings() {
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  // Selected Booking Drawer
  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null);

  // Handover Modal State
  const [handoverType, setHandoverType] = useState<'pickup' | 'return' | null>(null);
  const [odometer, setOdometer] = useState<number>(45000);
  const [fuel, setFuel] = useState<number>(100);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);

  const fetchBookings = async () => {
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('bookings')
        .select(`
          id,
          ref,
          user_id,
          pickup_place,
          period,
          driver_option,
          addons,
          subtotal,
          tax,
          total,
          status,
          notes,
          created_at,
          customer:profiles (
            name,
            phone
          ),
          car:cars (
            name,
            slug,
            category
          ),
          handover_records (
            id,
            type,
            odometer,
            fuel,
            notes,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const formatted: StaffBooking[] = (data || []).map((b) => {
        const custData = b.customer as unknown as { name: string; phone: string } | { name: string; phone: string }[] | null;
        const carData = b.car as unknown as { name: string; slug: string; category: string } | { name: string; slug: string; category: string }[] | null;
        return {
          ...b,
          customer: Array.isArray(custData) ? custData[0] : custData,
          car: Array.isArray(carData) ? carData[0] : carData,
        };
      });

      setBookings(formatted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bookings.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !handoverType) return;

    setHandoverLoading(true);
    setHandoverError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('record_handover', {
        p_booking_id: selectedBooking.id,
        p_type: handoverType,
        p_odometer: Number(odometer),
        p_fuel: Number(fuel),
        p_photo_paths: [] as string[],
        p_notes: handoverNotes.trim() || null,
      });

      if (rpcErr) throw rpcErr;

      setHandoverSuccess(`Successfully recorded ${handoverType} handover for ${selectedBooking.ref}.`);
      setHandoverType(null);
      setHandoverNotes('');
      await fetchBookings();
      setSelectedBooking(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit handover record.';
      setHandoverError(msg);
    } finally {
      setHandoverLoading(false);
    }
  };

  const parseDates = (periodStr: string) => {
    try {
      const clean = periodStr.replace(/[[\]()"]/g, '');
      const [start, end] = clean.split(',');
      return {
        startStr: formatDateTimeIST(start),
        endStr: formatDateTimeIST(end),
      };
    } catch {
      return { startStr: periodStr, endStr: '' };
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter !== 'all') {
      if (filter === 'pending' && !['pending', 'contacted', 'no_answer'].includes(b.status)) return false;
      if (filter === 'confirmed' && b.status !== 'confirmed') return false;
      if (filter === 'active' && b.status !== 'active') return false;
      if (filter === 'completed' && b.status !== 'completed') return false;
      if (filter === 'cancelled' && !['cancelled', 'rejected'].includes(b.status)) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchRef = b.ref.toLowerCase().includes(q);
      const matchCust = (b.customer?.name || '').toLowerCase().includes(q) || (b.customer?.phone || '').includes(q);
      const matchCar = (b.car?.name || '').toLowerCase().includes(q);
      return matchRef || matchCust || matchCar;
    }

    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Reservations & Handover</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Manage customer car collection, odometer/fuel verification, and return inspections.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Search ref, customer, car..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
              minWidth: '220px',
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }} role="tablist">
        {(['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="btn btn-sm"
            role="tab"
            aria-selected={filter === tab}
            style={{
              background: filter === tab ? 'var(--gold)' : 'var(--card)',
              color: filter === tab ? '#0b0d10' : 'var(--text)',
              borderColor: filter === tab ? 'var(--gold)' : 'var(--line)',
              fontWeight: filter === tab ? 700 : 500,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {handoverSuccess && (
        <div className="ok" role="status" style={{ marginBottom: '1.25rem' }}>
          {handoverSuccess}
        </div>
      )}

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading reservations...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--mute)' }}>
          No reservations found matching current filters.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 0.5rem',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr style={{ color: 'var(--mute)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 1rem' }}>Ref / Date</th>
                <th style={{ padding: '0.5rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.5rem 1rem' }}>Car</th>
                <th style={{ padding: '0.5rem 1rem' }}>Rental Period</th>
                <th style={{ padding: '0.5rem 1rem' }}>Total</th>
                <th style={{ padding: '0.5rem 1rem' }}>Status</th>
                <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const { startStr, endStr } = parseDates(b.period);
                const hasPickup = (b.handover_records || []).some((h) => h.type === 'pickup');
                const hasReturn = (b.handover_records || []).some((h) => h.type === 'return');

                return (
                  <tr
                    key={b.id}
                    style={{
                      background: 'var(--card)',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    <td style={{ padding: '1rem', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--gold)' }}>
                        {b.ref}
                      </div>
                      <div style={{ color: 'var(--mute)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                        {formatDateTimeIST(b.created_at)}
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{b.customer?.name || 'Customer'}</div>
                      <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>{b.customer?.phone || 'No phone'}</div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{b.car?.name || 'Vehicle'}</div>
                      <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>{b.car?.category}</div>
                    </td>

                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      <div>{startStr}</div>
                      <div style={{ color: 'var(--mute)' }}>to {endStr}</div>
                    </td>

                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {inr(b.total)}
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          textTransform: 'capitalize',
                          fontWeight: 600,
                          background:
                            b.status === 'active'
                              ? 'rgba(34,197,94,0.2)'
                              : b.status === 'confirmed'
                              ? 'rgba(34,197,94,0.15)'
                              : b.status === 'completed'
                              ? 'rgba(148,163,184,0.15)'
                              : 'rgba(226,172,47,0.15)',
                          color:
                            b.status === 'active'
                              ? '#22c55e'
                              : b.status === 'confirmed'
                              ? '#4ade80'
                              : b.status === 'completed'
                              ? '#94a3b8'
                              : 'var(--gold)',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {b.status === 'confirmed' && !hasPickup && (
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setHandoverType('pickup');
                              setOdometer(45000);
                              setFuel(100);
                              setHandoverNotes('');
                              setHandoverError(null);
                            }}
                            className="btn btn-sm btn-gold"
                            style={{ padding: '0.35rem 0.65rem' }}
                          >
                            Pickup Handover
                          </button>
                        )}

                        {b.status === 'active' && !hasReturn && (
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setHandoverType('return');
                              setOdometer(45500);
                              setFuel(100);
                              setHandoverNotes('');
                              setHandoverError(null);
                            }}
                            className="btn btn-sm"
                            style={{ background: 'rgba(34,197,94,0.2)', borderColor: '#22c55e', color: '#4ade80', padding: '0.35rem 0.65rem' }}
                          >
                            Return Inspection
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="btn btn-sm"
                          style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--text)', padding: '0.35rem 0.65rem' }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Handover Modal (Pickup or Return) */}
      {selectedBooking && handoverType && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="handover-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              background: '#12161f',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            <h3 id="handover-modal-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
              Record {handoverType} Handover: {selectedBooking.ref}
            </h3>
            <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Vehicle: <strong>{selectedBooking.car?.name}</strong> • Customer: {selectedBooking.customer?.name} ({selectedBooking.customer?.phone})
            </p>

            {handoverError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {handoverError}
              </div>
            )}

            <form onSubmit={handleHandoverSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="handover-odo" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Odometer Reading (km) *
                </label>
                <input
                  id="handover-odo"
                  type="number"
                  required
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="handover-fuel" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Fuel Level Percentage (%) * (Current: {fuel}%)
                </label>
                <input
                  id="handover-fuel"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={fuel}
                  onChange={(e) => setFuel(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="handover-notes" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  {handoverType === 'pickup' ? 'Initial Vehicle Inspection Notes' : 'Return Damages / Deposit Notes'}
                </label>
                <textarea
                  id="handover-notes"
                  rows={3}
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder={
                    handoverType === 'pickup'
                      ? 'e.g. Spare tyre and jack verified. Fastag active with Rs 500 balance.'
                      : 'e.g. Vehicle returned spotless. Full security deposit cleared for refund.'
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setHandoverType(null);
                  }}
                  disabled={handoverLoading}
                  className="btn btn-sm"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={handoverLoading}
                  className="btn btn-sm btn-gold"
                  style={{ fontWeight: 700 }}
                >
                  {handoverLoading ? 'Saving...' : `Complete ${handoverType === 'pickup' ? 'Pickup' : 'Return'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Details Drawer Modal */}
      {selectedBooking && !handoverType && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-drawer-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#12161f',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="booking-drawer-title" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>
                Booking Details: {selectedBooking.ref}
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="grid g2" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>Customer</div>
                <div style={{ fontWeight: 600 }}>{selectedBooking.customer?.name || 'Customer'}</div>
                <div style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>{selectedBooking.customer?.phone}</div>
              </div>

              <div>
                <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>Vehicle</div>
                <div style={{ fontWeight: 600 }}>{selectedBooking.car?.name}</div>
                <div style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>{selectedBooking.car?.category}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>Pickup Location</div>
              <div style={{ fontWeight: 600 }}>{selectedBooking.pickup_place}</div>
            </div>

            <div style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>Price Breakdown</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                <span>Subtotal:</span>
                <span>{inr(selectedBooking.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                <span>GST (18%):</span>
                <span>{inr(selectedBooking.tax)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', fontWeight: 800, color: 'var(--gold)', borderTop: '1px solid var(--line)' }}>
                <span>Total Amount:</span>
                <span>{inr(selectedBooking.total)}</span>
              </div>
            </div>

            {selectedBooking.notes && (
              <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                <div style={{ color: 'var(--gold)', fontWeight: 600, marginBottom: '0.2rem' }}>Notes:</div>
                <div style={{ color: 'var(--text)', whiteSpace: 'pre-line' }}>{selectedBooking.notes}</div>
              </div>
            )}

            {selectedBooking.handover_records && selectedBooking.handover_records.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--gold)' }}>Handover Records</h4>
                {selectedBooking.handover_records.map((h) => (
                  <div key={h.id} style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.5rem' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{h.type} Handover:</span> Odometer {h.odometer} km • Fuel {h.fuel}%
                    {h.notes && <div style={{ color: 'var(--mute)', marginTop: '0.2rem' }}>{h.notes}</div>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn btn-sm btn-gold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
