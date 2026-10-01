import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDateTimeIST } from '../../lib/format';

interface AuditRecord {
  id: string;
  actor_id: string | null;
  action: string;
  table: string;
  record_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  actor?: { name: string } | null;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [tableFilter, setTableFilter] = useState('ALL');

  // Selected Log Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);

  const fetchAuditLogs = async () => {
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('audit_logs')
        .select(`
          id,
          actor_id,
          action,
          table,
          record_id,
          before,
          after,
          ip,
          created_at,
          actor:profiles(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchErr) throw fetchErr;

      const formatted: AuditRecord[] = (data || []).map((l) => {
        const actorData = l.actor as unknown as { name: string } | { name: string }[] | null;
        return {
          ...l,
          actor: Array.isArray(actorData) ? actorData[0] : actorData,
        };
      });

      setLogs(formatted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load audit logs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (tableFilter !== 'ALL' && log.table !== tableFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchTable = log.table.toLowerCase().includes(q);
      const matchRecord = (log.record_id || '').toLowerCase().includes(q);
      const matchActor = (log.actor?.name || '').toLowerCase().includes(q);
      return matchAction || matchTable || matchRecord || matchActor;
    }

    return true;
  });

  return (
    <div>
      {/* Header */}
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Security Audit Trail</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Cryptographically protected, immutable audit records capturing every mutation and privileged operation.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="btn btn-sm"
          style={{ background: 'var(--card)', borderColor: 'var(--line)', color: 'var(--text)' }}
        >
          ↻ Refresh Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="search"
            placeholder="Search action, table, record ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
              minWidth: '220px',
            }}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Actions</option>
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="CREATE_EMPLOYEE">CREATE_EMPLOYEE</option>
          </select>

          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Tables</option>
            <option value="bookings">bookings</option>
            <option value="profiles">profiles</option>
            <option value="cars">cars</option>
            <option value="site_settings">site_settings</option>
            <option value="documents">documents</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Audit Log Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading security audit trail...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          No audit records found matching current filters.
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--mute)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Timestamp (IST)</th>
                <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                <th style={{ padding: '0.85rem 1rem' }}>Target Table</th>
                <th style={{ padding: '0.85rem 1rem' }}>Record ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>Actor</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Diff</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                    {formatDateTimeIST(log.created_at)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background:
                          log.action === 'INSERT' || log.action === 'CREATE_EMPLOYEE'
                            ? 'rgba(74,222,128,0.15)'
                            : log.action === 'UPDATE'
                            ? 'rgba(56,189,248,0.15)'
                            : 'rgba(248,113,113,0.15)',
                        color:
                          log.action === 'INSERT' || log.action === 'CREATE_EMPLOYEE'
                            ? '#4ade80'
                            : log.action === 'UPDATE'
                            ? '#38bdf8'
                            : '#f87171',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                    {log.table}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: 'var(--mute)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.record_id || 'N/A'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {log.actor?.name ? (
                      <span style={{ fontWeight: 600 }}>{log.actor.name}</span>
                    ) : log.actor_id ? (
                      <span style={{ color: 'var(--mute)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {log.actor_id.slice(0, 8)}...
                      </span>
                    ) : (
                      <span style={{ color: 'var(--mute)', fontSize: '0.75rem' }}>System / Public</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="btn btn-sm"
                      style={{ background: 'var(--bg)', borderColor: 'var(--line)', fontSize: '0.75rem' }}
                    >
                      Inspect Diff
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* JSON Diff Modal */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="diff-modal-title"
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
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 id="diff-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Audit Mutation: {selectedLog.action} on {selectedLog.table}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--mute)', margin: '0.2rem 0 0 0' }}>
                  Record: {selectedLog.record_id || 'N/A'} • {formatDateTimeIST(selectedLog.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="grid g2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#f87171' }}>State Before</h4>
                <pre
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    maxHeight: '320px',
                    color: selectedLog.before ? 'var(--text)' : 'var(--mute)',
                  }}
                >
                  {selectedLog.before ? JSON.stringify(selectedLog.before, null, 2) : 'null (None / Created)'}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#4ade80' }}>State After</h4>
                <pre
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    maxHeight: '320px',
                    color: selectedLog.after ? 'var(--text)' : 'var(--mute)',
                  }}
                >
                  {selectedLog.after ? JSON.stringify(selectedLog.after, null, 2) : 'null (Deleted)'}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-sm"
                style={{ background: 'var(--card)', borderColor: 'var(--line)' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
