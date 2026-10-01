import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDateTimeIST } from '../../lib/format';

interface NotificationRecord {
  id: string;
  channel: 'whatsapp' | 'email' | 'sms';
  recipient: string;
  template_key: string;
  payload: Record<string, unknown> | null;
  status: 'queued' | 'sent' | 'failed';
  provider_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manual Test Simulation Form
  const [showSimModal, setShowSimModal] = useState(false);
  const [simChannel, setSimChannel] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [simRecipient, setSimRecipient] = useState('+91 98765 43210');
  const [simTemplate, setSimTemplate] = useState('booking_received');
  const [simSending, setSimSending] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch notification logs.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleDispatchSandbox = async () => {
    setDispatching(true);
    setFeedback(null);
    try {
      const { data: count, error } = await supabase.rpc('dispatch_notifications_sandbox');
      if (error) throw error;

      setFeedback({
        type: 'success',
        message: count > 0
          ? `Dispatched ${count} pending notification${count === 1 ? '' : 's'} through mock gateway sandbox.`
          : 'Dispatched 0 pending notifications. All notifications up to date.',
      });
      await fetchNotifications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sandbox dispatch failed.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setDispatching(false);
    }
  };

  const handleSendSimulated = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimSending(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        channel: simChannel,
        recipient: simRecipient,
        template_key: simTemplate,
        payload: {
          name: 'Sandbox Customer',
          ref: 'GLV-TEST99',
          car: 'Mahindra Thar 4x4',
          pickup: '2026-10-15 10:00 AM',
          return: '2026-10-18 08:00 PM',
        },
        status: 'queued',
      });

      if (error) throw error;

      setShowSimModal(false);
      setFeedback({
        type: 'success',
        message: `Enqueued test ${simChannel.toUpperCase()} notification for ${simRecipient}.`,
      });
      await fetchNotifications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to queue test notification.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSimSending(false);
    }
  };

  const queuedCount = notifications.filter((n) => n.status === 'queued').length;
  const sentCount = notifications.filter((n) => n.status === 'sent').length;
  const failedCount = notifications.filter((n) => n.status === 'failed').length;

  const filtered = notifications.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (channelFilter !== 'all' && item.channel !== channelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRecip = item.recipient.toLowerCase().includes(q);
      const matchKey = item.template_key.toLowerCase().includes(q);
      const matchProv = item.provider_id?.toLowerCase().includes(q);
      if (!matchRecip && !matchKey && !matchProv) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Main Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
            Multi-Channel Notification Gateway
          </h2>
          <p style={{ color: 'var(--mute)', margin: 0, fontSize: '0.9rem' }}>
            Sandbox telemetry, real-time message queue, mock provider dispatchers, and delivery logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowSimModal(true)}
            className="btn btn-sm"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--line)',
              color: 'var(--text)',
            }}
          >
            ✉️ Enqueue Test Msg
          </button>

          <button
            onClick={handleDispatchSandbox}
            disabled={dispatching}
            className="btn btn-sm"
            data-testid="dispatch-sandbox-btn"
            style={{
              background: 'var(--gold)',
              color: '#0b0d10',
              borderColor: 'var(--gold)',
              fontWeight: 700,
              cursor: dispatching ? 'not-allowed' : 'pointer',
            }}
          >
            {dispatching ? '🚀 Dispatching...' : `🚀 Dispatch Sandbox Queue (${queuedCount})`}
          </button>

          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="btn btn-sm"
            style={{
              background: 'transparent',
              borderColor: 'var(--line)',
              color: 'var(--mute)',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2rem' }}>⏳</div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)' }}>
              {queuedCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>Queued Messages</div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2rem' }}>📨</div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
              {sentCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>Sent via Sandbox</div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: failedCount > 0 ? '#ef4444' : 'var(--mute)' }}>
              {failedCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>Failed Deliveries</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: '6px',
            background: feedback.type === 'success' ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedback.type === 'success' ? '#4ade80' : '#f87171',
            fontSize: '0.9rem',
          }}
        >
          {feedback.message}
        </div>
      )}

      {/* Filters and Controls */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'var(--card)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['all', 'queued', 'sent', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="btn btn-sm"
              style={{
                background: statusFilter === s ? 'var(--gold)' : 'transparent',
                color: statusFilter === s ? '#0b0d10' : 'var(--text)',
                borderColor: statusFilter === s ? 'var(--gold)' : 'var(--line)',
                fontWeight: statusFilter === s ? 700 : 500,
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          aria-label="Filter by channel"
          style={{
            padding: '0.45rem 0.75rem',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">All Channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
        </select>

        <input
          type="text"
          placeholder="Search by recipient, template key, provider ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.45rem 0.75rem',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '0.85rem',
            flex: '1',
            minWidth: '220px',
          }}
        />
      </div>

      {/* Notifications Table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--mute)' }}>
          Loading notification logs...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'var(--card)',
            borderRadius: '8px',
            border: '1px dashed var(--line)',
            color: 'var(--mute)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📬</div>
          <div style={{ fontWeight: 600, color: 'var(--text)' }}>No notification records found</div>
          <div style={{ fontSize: '0.85rem' }}>Use the simulator above to queue a test notification.</div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Channel</th>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Recipient</th>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Template</th>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Payload Details</th>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Provider ID</th>
                <th style={{ padding: '0.875rem 1rem', color: 'var(--mute)' }}>Logged (IST)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                let channelBadge = { icon: '💬', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' };
                if (item.channel === 'whatsapp') {
                  channelBadge = { icon: '🟢', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' };
                } else if (item.channel === 'email') {
                  channelBadge = { icon: '✉️', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' };
                } else if (item.channel === 'sms') {
                  channelBadge = { icon: '📱', color: '#c084fc', bg: 'rgba(192,132,252,0.1)' };
                }

                let statusColor = 'var(--gold)';
                let statusBg = 'rgba(226,172,47,0.15)';
                if (item.status === 'sent') {
                  statusColor = '#4ade80';
                  statusBg = 'rgba(74,222,128,0.15)';
                } else if (item.status === 'failed') {
                  statusColor = '#f87171';
                  statusBg = 'rgba(239,68,68,0.15)';
                }

                return (
                  <tr
                    key={item.id}
                    data-testid={`notification-row-${item.id}`}
                    style={{ borderBottom: '1px solid var(--line)' }}
                  >
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: channelBadge.bg,
                          color: channelBadge.color,
                          textTransform: 'uppercase',
                        }}
                      >
                        {channelBadge.icon} {item.channel}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{item.recipient}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <code style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>{item.template_key}</code>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', maxWidth: '300px' }}>
                      {item.payload ? (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--mute)',
                            background: 'var(--bg)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={JSON.stringify(item.payload, null, 2)}
                        >
                          {JSON.stringify(item.payload)}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--mute)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: statusBg,
                          color: statusColor,
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--mute)' }}>
                      {item.provider_id || '-'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--mute)', fontSize: '0.8rem' }}>
                      {formatDateTimeIST(item.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sim-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3 id="sim-title" style={{ margin: '0 0 0.5rem', color: 'var(--gold)' }}>
              Enqueue Mock Notification
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--mute)', margin: '0 0 1.25rem' }}>
              Simulate customer event triggers to test gateway routing and message delivery.
            </p>

            <form onSubmit={handleSendSimulated} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Channel
                </label>
                <select
                  value={simChannel}
                  onChange={(e) => setSimChannel(e.target.value as 'whatsapp' | 'email' | 'sms')}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                  }}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Recipient (Phone or Email)
                </label>
                <input
                  type="text"
                  required
                  value={simRecipient}
                  onChange={(e) => setSimRecipient(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Template Key
                </label>
                <select
                  value={simTemplate}
                  onChange={(e) => setSimTemplate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                  }}
                >
                  <option value="booking_received">booking_received</option>
                  <option value="kyc_approved">kyc_approved</option>
                  <option value="kyc_rejected">kyc_rejected</option>
                  <option value="booking_cancelled">booking_cancelled</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="btn btn-sm"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simSending}
                  className="btn btn-sm"
                  style={{ background: 'var(--gold)', color: '#0b0d10', fontWeight: 700 }}
                >
                  {simSending ? 'Queueing...' : 'Enqueue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
