import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { inr, formatDateTimeIST } from '../../lib/format';

interface OverviewProps {
  onNavigate: (tab: 'bookings' | 'documents' | 'profile' | 'security') => void;
}

interface ActiveBooking {
  id: string;
  ref: string;
  pickup_place: string;
  period: string;
  driver_option: string;
  total: number;
  status: string;
  created_at: string;
  car: { name: string; category: string } | null;
}

export default function AccountOverview({ onNavigate }: OverviewProps) {
  const { user, profile } = useAuth();
  const [totalBookings, setTotalBookings] = useState(0);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [kycDocsCount, setKycDocsCount] = useState(0);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch bookings
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            id,
            ref,
            pickup_place,
            period,
            driver_option,
            total,
            status,
            created_at,
            car:cars (
              name,
              category
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bookingsData) {
          setTotalBookings(bookingsData.length);
          const upcoming = (bookingsData as unknown as ActiveBooking[]).find((b) =>
            ['pending', 'contacted', 'confirmed', 'active'].includes(b.status)
          );
          setActiveBooking(upcoming || null);
        }

        // Fetch documents
        const { data: docsData } = await supabase
          .from('documents')
          .select('id, kind, verified')
          .eq('user_id', user.id);

        if (docsData) {
          setKycDocsCount(docsData.length);
          const hasDl = docsData.some((d) => d.kind === 'driving_licence' && d.verified);
          const hasId = docsData.some((d) => d.kind === 'id_proof' && d.verified);
          setIsKycVerified(hasDl && hasId);
        }
      } catch {
        // Handled silently for dashboard fallback
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const parseDates = (periodStr: string) => {
    try {
      const clean = periodStr.replace(/[[\]()"]/g, '');
      const [start, end] = clean.split(',');
      return `${formatDateTimeIST(start)} — ${formatDateTimeIST(end)}`;
    } catch {
      return periodStr;
    }
  };

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          border: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '1.75rem',
          marginBottom: '1.5rem',
          background: 'linear-gradient(135deg, rgba(226,172,47,0.08) 0%, rgba(16,20,26,0.95) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer Portal
            </span>
            <h2 style={{ fontSize: '1.6rem', marginTop: '0.2rem', marginBottom: '0.35rem' }}>
              Welcome back, {profile?.name || user?.email?.split('@')[0] || 'Driver'}
            </h2>
            <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
              Manage your self-drive trips, KYC identity documents, and rental preferences.
            </p>
          </div>

          <a href="/booking" className="btn btn-gold">
            + Book a New Car
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid g3" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Total Bookings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)' }}>
            {loading ? '...' : totalBookings}
          </div>
          <button
            onClick={() => onNavigate('bookings')}
            className="btn btn-sm"
            style={{ marginTop: '0.5rem', padding: '0', background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            View all bookings →
          </button>
        </div>

        <div className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>KYC Verification</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isKycVerified ? '#4ade80' : 'var(--gold)' }}>
            {loading ? '...' : isKycVerified ? 'Verified ✓' : `${kycDocsCount}/3 Uploaded`}
          </div>
          <button
            onClick={() => onNavigate('documents')}
            className="btn btn-sm"
            style={{ marginTop: '0.5rem', padding: '0', background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {isKycVerified ? 'Manage documents →' : 'Complete verification →'}
          </button>
        </div>

        <div className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Registered Contact</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
            {profile?.phone || 'Phone not set'}
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="btn btn-sm"
            style={{ marginTop: '0.5rem', padding: '0', background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Edit profile →
          </button>
        </div>
      </div>

      {/* Active / Next Trip Highlight */}
      <div className="card" style={{ border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Active / Next Reservation</h3>

        {loading ? (
          <div style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>Loading active trip details...</div>
        ) : activeBooking ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, color: 'var(--gold)', fontSize: '1.1rem' }}>
                  {activeBooking.ref}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    textTransform: 'capitalize',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(226,172,47,0.15)',
                    color: 'var(--gold)',
                    border: '1px solid rgba(226,172,47,0.3)',
                  }}
                >
                  {activeBooking.status}
                </span>
              </div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>
                {activeBooking.car?.name || 'Reserved Car'}
              </h4>
              <p style={{ color: 'var(--mute)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Pickup: {activeBooking.pickup_place}
              </p>
              <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                {parseDates(activeBooking.period)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold)' }}>
                {inr(activeBooking.total)}
              </div>
              <button
                onClick={() => onNavigate('bookings')}
                className="btn btn-sm btn-gold"
                style={{ marginTop: '0.75rem' }}
              >
                View Trip Details
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ color: 'var(--mute)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              You do not have any active or upcoming reservations.
            </p>
            <a href="/cars" className="btn btn-sm btn-gold">
              Explore Our Fleet
            </a>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid g3">
        <div
          onClick={() => onNavigate('bookings')}
          className="card"
          style={{ cursor: 'pointer', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', transition: 'border-color 0.2s ease' }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🚘</div>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>My Bookings</h4>
          <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>
            Track pickup timelines, invoice receipts, and cancellations.
          </p>
        </div>

        <div
          onClick={() => onNavigate('documents')}
          className="card"
          style={{ cursor: 'pointer', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', transition: 'border-color 0.2s ease' }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📄</div>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>KYC Documents</h4>
          <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>
            Upload Driving Licence and ID proof for fast car collection.
          </p>
        </div>

        <div
          onClick={() => onNavigate('security')}
          className="card"
          style={{ cursor: 'pointer', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', transition: 'border-color 0.2s ease' }}
        >
          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔒</div>
          <h4 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Security & Auth</h4>
          <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>
            Manage your password, login credentials, and active sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
