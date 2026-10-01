import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { inr, formatDateTimeIST } from '../../lib/format';

interface StatusHistory {
  id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

interface StatusHistoryRow extends StatusHistory {
  booking_id: string;
}

interface BookingCar {
  id: number;
  name: string;
  slug: string;
  category: string;
  price_per_day: number;
}

interface BookingRecord {
  id: string;
  ref: string;
  pickup_place: string;
  period: string;
  driver_option: string;
  addons: Array<{ key: string; label: string; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'contacted' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'rejected' | 'no_answer';
  notes: string | null;
  created_at: string;
  car: BookingCar | null;
  status_history?: StatusHistory[];
}

export default function AccountBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<BookingRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Change of travel plans');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: bookingsData, error: bookingsErr } = await supabase
        .from('bookings')
        .select(`
          id,
          ref,
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
          car:cars (
            id,
            name,
            slug,
            category,
            price_per_day
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsErr) throw bookingsErr;

      // Also fetch status history for all user bookings
      const bookingIds = (bookingsData || []).map((b) => b.id);
      let historyMap: Record<string, StatusHistory[]> = {};

      if (bookingIds.length > 0) {
        const { data: histData } = await supabase
          .from('booking_status_history')
          .select('id, booking_id, from_status, to_status, note, created_at')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: true });

        if (histData) {
          historyMap = (histData as StatusHistoryRow[]).reduce<Record<string, StatusHistory[]>>((acc, item) => {
            if (!acc[item.booking_id]) acc[item.booking_id] = [];
            acc[item.booking_id].push(item);
            return acc;
          }, {});
        }
      }

      const formatted: BookingRecord[] = (bookingsData || []).map((b) => {
        const carData = b.car as unknown as BookingCar | BookingCar[] | null;
        return {
          ...b,
          car: Array.isArray(carData) ? carData[0] : carData,
          status_history: historyMap[b.id] || [],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('cancel_booking', {
        p_booking_id: cancellingBooking.id,
        p_reason: cancelReason,
      });

      if (rpcErr) throw rpcErr;

      setCancelSuccess(`Booking ${cancellingBooking.ref} has been cancelled successfully.`);
      setCancellingBooking(null);
      await fetchBookings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel booking.';
      setCancelError(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  const parsePeriod = (periodStr: string) => {
    // Format: ["2026-10-01 10:00:00+05:30","2026-10-03 10:00:00+05:30")
    try {
      const clean = periodStr.replace(/[[\]()"]/g, '');
      const [start, end] = clean.split(',');
      return {
        startStr: formatDateTimeIST(start),
        endStr: formatDateTimeIST(end),
        startDate: new Date(start),
        isFuture: new Date(start).getTime() > Date.now(),
      };
    } catch {
      return { startStr: periodStr, endStr: '', startDate: new Date(), isFuture: false };
    }
  };

  const getStatusBadge = (status: BookingRecord['status']) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmed', style: { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' } };
      case 'active':
        return { label: 'Trip Active', style: { background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid #22c55e' } };
      case 'contacted':
        return { label: 'Team Contacted', style: { background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' } };
      case 'pending':
        return { label: 'Pending Verification', style: { background: 'rgba(226,172,47,0.15)', color: 'var(--gold)', border: '1px solid rgba(226,172,47,0.3)' } };
      case 'completed':
        return { label: 'Completed', style: { background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' } };
      case 'cancelled':
        return { label: 'Cancelled', style: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' } };
      case 'rejected':
        return { label: 'Declined', style: { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' } };
      default:
        return { label: status, style: { background: 'rgba(255,255,255,0.1)', color: 'var(--text)', border: '1px solid var(--line)' } };
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'active') return ['pending', 'contacted', 'confirmed', 'active'].includes(b.status);
    if (filter === 'completed') return b.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'rejected'].includes(b.status);
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Bookings</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>Track rental status, view receipts, or manage reservations.</p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} role="tablist" aria-label="Filter bookings">
          {(['all', 'active', 'completed', 'cancelled'] as const).map((tab) => (
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
                cursor: 'pointer',
              }}
            >
              {tab === 'all' ? `All (${bookings.length})` : tab}
            </button>
          ))}
        </div>
      </div>

      {cancelSuccess && (
        <div className="ok" role="status" style={{ marginBottom: '1.5rem' }}>
          {cancelSuccess}
        </div>
      )}

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading your reservations...
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🚘</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No bookings found</h3>
          <p style={{ color: 'var(--mute)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
            {filter === 'all'
              ? "You haven't reserved any vehicles yet. Explore our fleet to plan your next journey."
              : `No ${filter} bookings to display.`}
          </p>
          <a href="/cars" className="btn btn-gold">
            Browse Available Cars
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredBookings.map((b) => {
            const { startStr, endStr, isFuture } = parsePeriod(b.period);
            const badge = getStatusBadge(b.status);
            const isCancelable = ['pending', 'contacted', 'confirmed'].includes(b.status) && isFuture;
            const isExpanded = expandedId === b.id;

            return (
              <div
                key={b.id}
                className="card"
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* Header row: Reference, Car, and Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)' }}>
                        {b.ref}
                      </span>
                      <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', ...badge.style }}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', marginTop: '0.35rem', marginBottom: '0.1rem' }}>
                      {b.car?.name || 'Selected Vehicle'}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                      {b.car?.category || 'Self-drive'} • {b.driver_option === 'chauffeur' ? 'With Chauffeur' : 'Self Drive'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold)' }}>
                      {inr(b.total)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>
                      Includes 18% GST
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid g3" style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ color: 'var(--mute)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Pickup & Return</div>
                    <div style={{ fontWeight: 600 }}>{startStr}</div>
                    <div style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>to {endStr}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--mute)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Pickup Location</div>
                    <div style={{ fontWeight: 600 }}>{b.pickup_place}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--mute)', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Booking Date</div>
                    <div style={{ fontWeight: 600 }}>{formatDateTimeIST(b.created_at)}</div>
                  </div>
                </div>

                {/* Timeline & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem' }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    className="btn btn-sm"
                    style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--text)' }}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? 'Hide Status History ▲' : 'View Status History ▼'}
                  </button>

                  {isCancelable && (
                    <button
                      onClick={() => {
                        setCancellingBooking(b);
                        setCancelError(null);
                      }}
                      className="btn btn-sm"
                      style={{ background: 'transparent', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>

                {/* Collapsible Timeline */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px dashed var(--line)',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '1rem',
                      borderRadius: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--gold)' }}>
                      Booking Status Timeline
                    </h4>

                    {(!b.status_history || b.status_history.length === 0) ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                        Current status: <strong>{b.status}</strong> (Created at {formatDateTimeIST(b.created_at)})
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {b.status_history.map((hist, idx) => (
                          <div key={hist.id || idx} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ color: 'var(--gold)', fontWeight: 700 }}>•</div>
                            <div>
                              <div>
                                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{hist.to_status}</span>
                                <span style={{ color: 'var(--mute)', marginLeft: '0.5rem', fontSize: '0.8rem' }}>
                                  {formatDateTimeIST(hist.created_at)}
                                </span>
                              </div>
                              {hist.note && <div style={{ color: 'var(--mute)', marginTop: '0.15rem' }}>{hist.note}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal Dialog */}
      {cancellingBooking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
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
              maxWidth: '480px',
              width: '100%',
              background: '#12161f',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '2rem',
            }}
          >
            <h3 id="cancel-modal-title" style={{ fontSize: '1.3rem', marginBottom: '0.75rem', color: '#f87171' }}>
              Cancel Booking {cancellingBooking.ref}?
            </h3>
            <p style={{ color: 'var(--mute)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Are you sure you want to cancel your rental for the <strong>{cancellingBooking.car?.name || 'car'}</strong>?
              Per Glivva policy, self-service cancellations are free prior to scheduled departure.
            </p>

            {cancelError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {cancelError}
              </div>
            )}

            <label style={{ display: 'block', marginBottom: '1.25rem' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                Reason for cancellation:
              </span>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  color: 'var(--text)',
                }}
              >
                <option value="Change of travel plans">Change of travel plans</option>
                <option value="Vehicle no longer required">Vehicle no longer required</option>
                <option value="Found alternative transportation">Found alternative transportation</option>
                <option value="Rescheduling dates">Rescheduling dates</option>
                <option value="Other">Other reason</option>
              </select>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                disabled={cancelLoading}
                className="btn btn-sm"
                style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="btn btn-sm"
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff', fontWeight: 700 }}
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
