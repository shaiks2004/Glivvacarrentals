import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { formatDateTimeIST } from '../../lib/format';

interface UserDoc {
  id: string;
  kind: 'driving_licence' | 'id_proof' | 'selfie';
  storage_path: string;
  verified: boolean;
  created_at: string;
}

const DOC_KINDS: Array<{
  kind: 'driving_licence' | 'id_proof' | 'selfie';
  title: string;
  required: boolean;
  desc: string;
  icon: string;
}> = [
  {
    kind: 'driving_licence',
    title: 'Driving Licence',
    required: true,
    desc: 'Clear photo or PDF of your valid Indian Driving Licence (LMV). Required for key handover.',
    icon: '🪪',
  },
  {
    kind: 'id_proof',
    title: 'Government Identity Proof',
    required: true,
    desc: 'Aadhaar Card, Passport, or Voter ID showing your current residential address.',
    icon: '📄',
  },
  {
    kind: 'selfie',
    title: 'Identity Verification Selfie',
    required: false,
    desc: 'Recent clear selfie for fast contactless car pickup at the parking hub.',
    icon: '🤳',
  },
];

export default function AccountDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Record<string, UserDoc>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDocuments = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('documents')
        .select('id, kind, storage_path, verified, created_at')
        .eq('user_id', user.id);

      if (fetchErr) throw fetchErr;

      const map: Record<string, UserDoc> = {};
      ((data || []) as UserDoc[]).forEach((doc) => {
        map[doc.kind] = doc;
      });
      setDocuments(map);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFileUpload = async (kind: 'driving_licence' | 'id_proof' | 'selfie', file: File) => {
    if (!user) return;
    setError(null);
    setSuccess(null);

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be 5MB or less.');
      return;
    }

    // Validate file type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setError('Only JPG, PNG, WebP, or PDF files are accepted.');
      return;
    }

    setUploadingKind(kind);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${kind}_${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage 'kyc' bucket
      const { error: uploadErr } = await supabase.storage.from('kyc').upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

      if (uploadErr) throw uploadErr;

      const existingDoc = documents[kind];

      if (existingDoc) {
        // Update existing document record
        const { error: dbErr } = await supabase
          .from('documents')
          .update({
            storage_path: filePath,
            verified: false,
          })
          .eq('id', existingDoc.id);

        if (dbErr) throw dbErr;
      } else {
        // Insert new document record
        const { error: dbErr } = await supabase.from('documents').insert({
          user_id: user.id,
          kind,
          storage_path: filePath,
          verified: false,
        });

        if (dbErr) throw dbErr;
      }

      setSuccess(`Successfully uploaded ${DOC_KINDS.find((k) => k.kind === kind)?.title || kind}. Verification is pending.`);
      await fetchDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploadingKind(null);
    }
  };

  const getStatusBadge = (doc?: UserDoc) => {
    if (!doc) {
      return {
        label: 'Not Uploaded',
        style: { background: 'rgba(255,255,255,0.06)', color: 'var(--mute)', border: '1px solid var(--line)' },
      };
    }
    if (doc.verified) {
      return {
        label: 'Verified ✓',
        style: { background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' },
      };
    }
    return {
      label: 'Pending Verification ⏱',
      style: { background: 'rgba(226,172,47,0.15)', color: 'var(--gold)', border: '1px solid rgba(226,172,47,0.3)' },
    };
  };

  const verifiedCount = Object.values(documents).filter((d) => d.verified).length;
  const isKycComplete = !!documents.driving_licence && !!documents.id_proof;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>KYC & Documents</h2>
        <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
          Upload your verification documents once for instant vehicle handover across all Glivva locations.
        </p>
      </div>

      {/* KYC Progress Overview Banner */}
      <div
        className="card"
        style={{
          border: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: isKycComplete ? 'rgba(34,197,94,0.05)' : 'rgba(226,172,47,0.05)',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            {isKycComplete
              ? verifiedCount >= 2
                ? 'All documents verified'
                : 'Documents submitted & under review'
              : 'Action required: Upload mandatory documents'}
          </h3>
          <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>
            {isKycComplete
              ? 'Our team verifies documents within 30 minutes of booking.'
              : 'Driving licence and identity proof are required to confirm reservations.'}
          </p>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '4px 12px',
            borderRadius: '20px',
            ...getStatusBadge(documents.driving_licence && documents.id_proof ? documents.driving_licence : undefined).style,
          }}
        >
          {Object.keys(documents).length} / 3 Uploaded
        </span>
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

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading your document records...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {DOC_KINDS.map((item) => {
            const doc = documents[item.kind];
            const badge = getStatusBadge(doc);
            const isUploading = uploadingKind === item.kind;

            return (
              <div
                key={item.kind}
                className="card"
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>{item.icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1.15rem' }}>{item.title}</h3>
                        {item.required && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>
                            (Required)
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{item.desc}</p>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: '4px', ...badge.style }}>
                    {badge.label}
                  </span>
                </div>

                {doc && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--mute)', marginBottom: '1rem' }}>
                    Last updated: {formatDateTimeIST(doc.created_at)}
                  </div>
                )}

                {/* File Upload Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'var(--card)',
                      border: '1px dashed var(--gold)',
                      borderRadius: '6px',
                      color: 'var(--gold)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span>{isUploading ? 'Uploading...' : doc ? 'Replace File' : 'Choose File'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(item.kind, file);
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '0.8rem', color: 'var(--mute)' }}>Max 5MB (JPG, PNG, PDF)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
