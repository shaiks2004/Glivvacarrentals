import { useLocation, useNavigate } from 'react-router-dom';
import PageHead from '../../components/PageHead';
import { useMeta } from '../../lib/useMeta';
import { useAuth } from '../../lib/auth';
import StaffCallQueue from './StaffCallQueue';
import StaffBookings from './StaffBookings';
import StaffFleet from './StaffFleet';
import StaffVerification from './StaffVerification';

type StaffTabKey = 'queue' | 'bookings' | 'fleet' | 'kyc';

const TABS: Array<{ key: StaffTabKey; label: string; path: string; icon: string }> = [
  { key: 'queue', label: 'Call Queue', path: '/staff', icon: '📞' },
  { key: 'bookings', label: 'Reservations & Handover', path: '/staff/bookings', icon: '📋' },
  { key: 'kyc', label: 'KYC Verification', path: '/staff/kyc', icon: '🪪' },
  { key: 'fleet', label: 'Fleet & Compliance', path: '/staff/fleet', icon: '🚗' },
];

export default function StaffHome() {
  useMeta('Staff Portal | Glivva Car Rentals', 'Operations, lead verification, fleet compliance and handover.');
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL pathname
  const currentPath = location.pathname.replace(/\/$/, '');
  let activeTab: StaffTabKey = 'queue';
  if (currentPath === '/staff/bookings') activeTab = 'bookings';
  else if (currentPath === '/staff/kyc') activeTab = 'kyc';
  else if (currentPath === '/staff/fleet') activeTab = 'fleet';

  const handleTabChange = (key: StaffTabKey) => {
    const tabObj = TABS.find((t) => t.key === key);
    if (tabObj) {
      navigate(tabObj.path);
    }
  };

  return (
    <>
      <PageHead
        title="Operations desk"
        lead={`Logged in as ${profile?.name || user?.email || 'Operations Officer'} (${profile?.role || 'Staff'}).`}
      />

      <section style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
        <div className="wrap">
          {/* Top Bar: Staff Profile Summary & Logout */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid var(--line)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--card)',
                  border: '1px solid var(--gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--gold)',
                }}
              >
                {(profile?.name || user?.email || 'S')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    {profile?.name || 'Operations Officer'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(226,172,47,0.15)',
                      color: 'var(--gold)',
                      fontWeight: 600,
                    }}
                  >
                    {profile?.role || 'Employee'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--mute)' }}>
                  {user?.email} {profile?.phone ? `• ${profile.phone}` : ''}
                </div>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="btn btn-sm"
              style={{
                borderColor: 'var(--line)',
                color: 'var(--mute)',
                background: 'transparent',
              }}
            >
              Sign out
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <nav
            role="tablist"
            aria-label="Staff operations sections"
            style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              marginBottom: '2rem',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '0.5rem',
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.key)}
                  className="btn btn-sm"
                  style={{
                    background: isActive ? 'var(--gold)' : 'var(--card)',
                    color: isActive ? '#0b0d10' : 'var(--text)',
                    borderColor: isActive ? 'var(--gold)' : 'var(--line)',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sub-View Content */}
          <div role="tabpanel">
            {activeTab === 'queue' && <StaffCallQueue />}
            {activeTab === 'bookings' && <StaffBookings />}
            {activeTab === 'kyc' && <StaffVerification />}
            {activeTab === 'fleet' && <StaffFleet />}
          </div>
        </div>
      </section>
    </>
  );
}
