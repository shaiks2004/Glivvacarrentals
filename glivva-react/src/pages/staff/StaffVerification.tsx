import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDateTimeIST } from '../../lib/format';

interface DocumentRecord {
  id: string;
  user_id: string;
  kind: 'driving_licence' | 'id_proof' | 'selfie';
  storage_path: string;
  verified: boolean;
  created_at: string;
  user_name?: string;
  user_phone?: string;
  user_email?: string;
}

const DOC_KIND_LABELS: Record<string, { label: string; icon: string }> = {
  driving_licence: { label: 'Driving Licence', icon: '🪪' },
  id_proof: { label: 'Government ID Proof', icon: '📄' },
  selfie: { label: 'Verification Selfie', icon: '🤳' },
};

export default function StaffVerification() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('pending');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingDoc, setRejectingDoc] = useState<DocumentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('Document unreadable, expired, or mismatching name');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data: docs, error: docErr } = await supabase
        .from('documents')
        .select('id, user_id, kind, storage_path, verified, created_at')
        .order('created_at', { ascending: false });

      if (docErr) throw docErr;

      if (!docs || docs.length === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      // Fetch user profile info for all unique user_ids
      const userIds = Array.from(new Set(docs.map((d) => d.user_id)));
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, phone')
        .in('id', userIds);

      if (profErr) {
        console.warn('Could not load profile names:', profErr.message);
      }

      const profileMap = new Map<string, { name?: string; phone?: string }>();
      (profiles || []).forEach((p) => {
        profileMap.set(p.id, { name: p.name, phone: p.phone });
      });

      const enriched: DocumentRecord[] = docs.map((d) => {
        const prof = profileMap.get(d.user_id);
        return {
          ...d,
          user_name: prof?.name || 'Customer',
          user_phone: prof?.phone || 'No phone recorded',
        };
      });

      setDocuments(enriched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch KYC documents.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleVerify = async (docId: string, verified: boolean, reason?: string) => {
    setProcessingId(docId);
    setFeedback(null);
    try {
      const { error } = await supabase.rpc('verify_kyc_document', {
        p_document_id: docId,
        p_verified: verified,
        p_note: reason || null,
      });

      if (error) throw error;

      setFeedback({
        type: 'success',
        message: verified
          ? 'KYC document approved successfully. Approval notification queued.'
          : 'KYC document rejected. User notification with rejection reason queued.',
      });

      // Update local state
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, verified } : d))
      );
      setRejectingDoc(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update document status.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === 'pending' && doc.verified === true) return false;
    if (filter === 'verified' && doc.verified === false) return false;
    if (selectedKind !== 'all' && doc.kind !== selectedKind) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = doc.user_name?.toLowerCase().includes(q);
      const matchPhone = doc.user_phone?.toLowerCase().includes(q);
      const matchId = doc.id.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchId) return false;
    }
    return true;
  });

  const pendingCount = documents.filter((d) => !d.verified).length;
  const verifiedCount = documents.filter((d) => d.verified).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Metric Highlights */}
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
            Customer KYC Verification Desk
          </h2>
          <p style={{ color: 'var(--mute)', margin: 0, fontSize: '0.9rem' }}>
            Review driving licences, ID proofs, and selfies for compliance before vehicle handover.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="btn btn-sm"
            style={{
              background: 'var(--card)',
              borderColor: 'var(--line)',
              color: 'var(--text)',
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Queue'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
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
          <div style={{ fontSize: '2rem' }}>🕒</div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)' }}>
              {pendingCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>Pending Review</div>
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
          <div style={{ fontSize: '2rem' }}>✅</div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
              {verifiedCount}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>Verified & Active</div>
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
          <div style={{ fontSize: '2rem' }}>📁</div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>
              {documents.length}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>Total Records</div>
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

      {/* Filters and Search Bar */}
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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['pending', 'all', 'verified'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="btn btn-sm"
              style={{
                background: filter === f ? 'var(--gold)' : 'transparent',
                color: filter === f ? '#0b0d10' : 'var(--text)',
                borderColor: filter === f ? 'var(--gold)' : 'var(--line)',
                fontWeight: filter === f ? 700 : 500,
                textTransform: 'capitalize',
              }}
            >
              {f === 'pending' ? `Pending Review (${pendingCount})` : f}
            </button>
          ))}
        </div>

        <select
          value={selectedKind}
          onChange={(e) => setSelectedKind(e.target.value)}
          aria-label="Filter by document type"
          style={{
            padding: '0.45rem 0.75rem',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: '4px',
            color: 'var(--text)',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">All Document Kinds</option>
          <option value="driving_licence">Driving Licences</option>
          <option value="id_proof">Government ID Proofs</option>
          <option value="selfie">Selfie Photos</option>
        </select>

        <input
          type="text"
          placeholder="Search by customer name, phone..."
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
            minWidth: '200px',
          }}
        />
      </div>

      {/* Document Queue List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--mute)' }}>
          Loading KYC verification documents...
        </div>
      ) : filteredDocs.length === 0 ? (
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
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
            No KYC documents matching criteria
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            {filter === 'pending'
              ? 'All customer documents are currently reviewed and up to date.'
              : 'Try clearing filters or search query.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredDocs.map((doc) => {
            const kindMeta = DOC_KIND_LABELS[doc.kind] || { label: doc.kind, icon: '📄' };
            const isBusy = processingId === doc.id;

            return (
              <div
                key={doc.id}
                data-testid={`kyc-card-${doc.id}`}
                style={{
                  background: 'var(--card)',
                  border: doc.verified ? '1px solid var(--line)' : '1px solid rgba(226,172,47,0.4)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                }}
              >
                {/* Left side: Customer & Doc Meta */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {kindMeta.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                        {kindMeta.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: doc.verified ? 'rgba(74,222,128,0.15)' : 'rgba(226,172,47,0.15)',
                          color: doc.verified ? '#4ade80' : 'var(--gold)',
                          border: `1px solid ${doc.verified ? 'rgba(74,222,128,0.3)' : 'rgba(226,172,47,0.3)'}`,
                        }}
                      >
                        {doc.verified ? '✓ VERIFIED' : '⏳ PENDING REVIEW'}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                      <strong>Customer:</strong> {doc.user_name}{' '}
                      <span style={{ color: 'var(--mute)' }}>• {doc.user_phone}</span>
                    </div>

                    <div style={{ marginTop: '0.2rem', fontSize: '0.8rem', color: 'var(--mute)' }}>
                      Uploaded: {formatDateTimeIST(doc.created_at)} • File Ref:{' '}
                      <code style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>
                        {doc.storage_path.split('/').pop() || doc.storage_path}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Right side: Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {doc.storage_path && (
                    <a
                      href={`https://placehold.co/800x500/10141a/e2ac2f?text=KYC+Preview:+${encodeURIComponent(doc.kind)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm"
                      style={{
                        background: 'transparent',
                        borderColor: 'var(--line)',
                        color: 'var(--mute)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>🔍</span> Preview
                    </a>
                  )}

                  {!doc.verified ? (
                    <>
                      <button
                        onClick={() => handleVerify(doc.id, true)}
                        disabled={isBusy}
                        className="btn btn-sm"
                        data-testid={`approve-doc-${doc.id}`}
                        style={{
                          background: '#15803d',
                          borderColor: '#22c55e',
                          color: '#fff',
                          fontWeight: 700,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isBusy ? 'Processing...' : '✓ Approve'}
                      </button>

                      <button
                        onClick={() => setRejectingDoc(doc)}
                        disabled={isBusy}
                        className="btn btn-sm"
                        data-testid={`reject-doc-${doc.id}`}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          borderColor: 'rgba(239,68,68,0.4)',
                          color: '#f87171',
                          fontWeight: 600,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        ✕ Reject
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRejectingDoc(doc)}
                      disabled={isBusy}
                      className="btn btn-sm"
                      style={{
                        background: 'transparent',
                        borderColor: 'var(--line)',
                        color: 'var(--mute)',
                        fontSize: '0.8rem',
                      }}
                    >
                      Revoke Verification
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-title"
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
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h3 id="reject-title" style={{ margin: '0 0 0.5rem', color: '#f87171' }}>
              Decline KYC Document
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--mute)', margin: '0 0 1rem' }}>
              Please provide a clear reason for declining this {rejectingDoc.kind.replace('_', ' ')}.
              The customer will receive an automated notification with this feedback.
            </p>

            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Reason for rejection:
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.65rem',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '0.9rem',
                marginBottom: '1.25rem',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setRejectingDoc(null)}
                className="btn btn-sm"
                style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerify(rejectingDoc.id, false, rejectReason)}
                disabled={processingId === rejectingDoc.id}
                className="btn btn-sm"
                style={{ background: '#b91c1c', borderColor: '#ef4444', color: '#fff', fontWeight: 700 }}
              >
                {processingId === rejectingDoc.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
