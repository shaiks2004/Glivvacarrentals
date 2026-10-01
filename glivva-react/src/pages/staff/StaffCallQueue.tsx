import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { inr, formatDateTimeIST } from '../../lib/format';

interface CallQueueLead {
  id: string;
  ref: string;
  user_id: string;
  car_id: number;
  pickup_place: string;
  period: string;
  driver_option: string;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  car_name: string | null;
  car_slug: string | null;
  car_category: string | null;
  employee_id: string | null;
  employee_name: string | null;
  assigned_at: string | null;
  attempts: number;
  last_call_at: string | null;
}

const OUTCOMES: Array<{ value: string; label: string }> = [
  { value: 'confirmed', label: 'Confirmed (Trip Approved)' },
  { value: 'no_answer', label: 'No Answer / Unreachable' },
  { value: 'reschedule', label: 'Reschedule / Follow-up Later' },
  { value: 'customer_cancelled', label: 'Customer Cancelled' },
  { value: 'rejected', label: 'Declined / Ineligible KYC' },
];

export default function StaffCallQueue() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CallQueueLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Outcome modal state
  const [selectedLead, setSelectedLead] = useState<CallQueueLead | null>(null);
  const [outcome, setOutcome] = useState('confirmed');
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchQueue = async () => {
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('v_call_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setLeads((data || []) as CallQueueLead[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load call queue.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Set up Realtime subscription on bookings table
    const channel = supabase
      .channel('staff_call_queue_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchQueue();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_assignments' },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClaim = async (leadId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const { error: claimErr } = await supabase.rpc('claim_booking', {
        p_booking_id: leadId,
      });

      if (claimErr) throw claimErr;

      setActionSuccess('Lead claimed successfully.');
      await fetchQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to claim lead.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const { error: outcomeErr } = await supabase.rpc('log_call_outcome', {
        p_booking_id: selectedLead.id,
        p_outcome: outcome,
        p_note: note.trim() || null,
      });

      if (outcomeErr) throw outcomeErr;

      setActionSuccess(`Call outcome (${outcome}) logged for booking ${selectedLead.ref}.`);
      setSelectedLead(null);
      setNote('');
      await fetchQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to log call outcome.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const getSlaBadge = (createdAtStr: string) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(createdAtStr).getTime()) / 60000);
    const slaTarget = 15; // 15 mins target SLA

    if (elapsedMinutes > slaTarget) {
      return {
        label: `${elapsedMinutes}m (Overdue)`,
        style: { background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', fontWeight: 700 },
      };
    }
    if (elapsedMinutes >= 10) {
      return {
        label: `${elapsedMinutes}m (Urgent)`,
        style: { background: 'rgba(226,172,47,0.2)', color: 'var(--gold)', border: '1px solid rgba(226,172,47,0.4)', fontWeight: 700 },
      };
    }
    return {
      label: `${elapsedMinutes}m ago`,
      style: { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
    };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Realtime Call Queue</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Newest pending booking leads requiring confirmation calls within the 15-minute SLA.
          </p>
        </div>

        <button
          onClick={() => fetchQueue()}
          className="btn btn-sm"
          style={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--gold)' }}
        >
          ↻ Refresh Queue ({leads.length})
        </button>
      </div>

      {actionSuccess && (
        <div className="ok" role="status" style={{ marginBottom: '1.25rem' }}>
          {actionSuccess}
        </div>
      )}

      {(error || actionError) && (
        <div className="err" role="alert" style={{ marginBottom: '1.25rem' }}>
          {error || actionError}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading active lead queue...
        </div>
      ) : leads.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📞</div>
          <h3 style={{ marginBottom: '0.35rem' }}>Call queue is clear</h3>
          <p style={{ color: 'var(--mute)', maxWidth: '400px', margin: '0 auto' }}>
            All incoming booking leads have been contacted and processed. New reservations will appear here in realtime.
          </p>
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
                <th style={{ padding: '0.5rem 1rem' }}>Ref / Lead</th>
                <th style={{ padding: '0.5rem 1rem' }}>Customer</th>
                <th style={{ padding: '0.5rem 1rem' }}>Vehicle</th>
                <th style={{ padding: '0.5rem 1rem' }}>SLA / Created</th>
                <th style={{ padding: '0.5rem 1rem' }}>Status / Agent</th>
                <th style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const sla = getSlaBadge(lead.created_at);
                const isClaimedByMe = lead.employee_id === user?.id;
                const rawPhone = lead.customer_phone || '';
                const cleanPhone = rawPhone.replace(/\D/g, '');
                const waMessage = encodeURIComponent(
                  `Hi ${lead.customer_name || 'there'}, this is ${user?.email?.split('@')[0] || 'Glivva Support'} regarding your booking ${lead.ref} for the ${lead.car_name || 'car'}. When is a good time to speak?`
                );

                return (
                  <tr
                    key={lead.id}
                    style={{
                      background: 'var(--card)',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    {/* Ref & Price */}
                    <td style={{ padding: '1rem', borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                      <div style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--gold)' }}>
                        {lead.ref}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>
                        {inr(lead.total)}
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{lead.customer_name || 'Guest Booker'}</div>
                      <div style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>{lead.customer_phone || 'No phone'}</div>
                    </td>

                    {/* Vehicle */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{lead.car_name || 'Vehicle'}</div>
                      <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>
                        {lead.car_category} • {lead.pickup_place}
                      </div>
                    </td>

                    {/* SLA Timer */}
                    <td style={{ padding: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', ...sla.style }}>
                        {sla.label}
                      </span>
                      <div style={{ color: 'var(--mute)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {formatDateTimeIST(lead.created_at)}
                      </div>
                    </td>

                    {/* Status & Assigned Agent */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize', color: lead.status === 'pending' ? 'var(--gold)' : 'var(--text)' }}>
                        {lead.status}
                      </div>
                      <div style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>
                        {lead.employee_name ? `Assigned: ${lead.employee_name}` : 'Unassigned'}
                      </div>
                      {lead.attempts > 0 && (
                        <div style={{ color: '#38bdf8', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                          {lead.attempts} call {lead.attempts === 1 ? 'attempt' : 'attempts'}
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '1rem', textAlign: 'right', borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {!lead.employee_id && (
                          <button
                            onClick={() => handleClaim(lead.id)}
                            disabled={actionLoading}
                            className="btn btn-sm btn-gold"
                            style={{ padding: '0.35rem 0.75rem' }}
                          >
                            Claim
                          </button>
                        )}

                        {rawPhone && (
                          <>
                            <a
                              href={`tel:${rawPhone}`}
                              className="btn btn-sm"
                              style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--text)', padding: '0.35rem 0.65rem' }}
                              title="Call customer"
                            >
                              📞 Call
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-sm"
                              style={{ background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80', padding: '0.35rem 0.65rem' }}
                              title="Message on WhatsApp"
                            >
                              💬 WA
                            </a>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setOutcome(lead.status === 'no_answer' ? 'no_answer' : 'confirmed');
                            setNote('');
                            setActionError(null);
                          }}
                          className="btn btn-sm"
                          style={{
                            background: isClaimedByMe ? 'var(--gold)' : 'transparent',
                            borderColor: isClaimedByMe ? 'var(--gold)' : 'var(--line)',
                            color: isClaimedByMe ? '#0b0d10' : 'var(--gold)',
                            fontWeight: 600,
                            padding: '0.35rem 0.75rem',
                          }}
                        >
                          Log Outcome
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

      {/* Outcome Logging Modal */}
      {selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="outcome-modal-title"
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
            <h3 id="outcome-modal-title" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
              Log Call Outcome: {selectedLead.ref}
            </h3>
            <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Customer: <strong>{selectedLead.customer_name}</strong> ({selectedLead.customer_phone}) • {selectedLead.car_name}
            </p>

            {actionError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {actionError}
              </div>
            )}

            <form onSubmit={handleLogOutcome}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Call Result *
                </label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '0.35rem' }}>
                  Agent Note / Customer Requirements
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Verified license photo. Customer arriving on Flight 6E-204 at 10 AM."
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
                  onClick={() => setSelectedLead(null)}
                  disabled={actionLoading}
                  className="btn btn-sm"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-sm btn-gold"
                  style={{ fontWeight: 700 }}
                >
                  {actionLoading ? 'Saving...' : 'Save & Update Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
