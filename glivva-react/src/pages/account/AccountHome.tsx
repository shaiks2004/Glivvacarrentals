import { useLocation, useNavigate } from 'react-router-dom';
import PageHead from '../../components/PageHead';
import { useMeta } from '../../lib/useMeta';
import { useAuth } from '../../lib/auth';
import AccountOverview from './AccountOverview';
import AccountBookings from './AccountBookings';
import AccountDocuments from './AccountDocuments';
import AccountProfile from './AccountProfile';
import AccountSecurity from './AccountSecurity';

type TabKey = 'overview' | 'bookings' | 'documents' | 'profile' | 'security';

const TABS: Array<{ key: TabKey; label: string; path: string; icon: string }> = [
  { key: 'overview', label: 'Dashboard', path: '/account', icon: '📊' },
  { key: 'bookings', label: 'My Bookings', path: '/account/bookings', icon: '🚘' },
  { key: 'documents', label: 'KYC Documents', path: '/account/documents', icon: '📄' },
  { key: 'profile', label: 'Profile', path: '/account/profile', icon: '👤' },
  { key: 'security', label: 'Security', path: '/account/security', icon: '🔒' },
];

export default function AccountHome() {
  useMeta('My Account | Glivva Car Rentals', 'Manage your bookings, identity verification, and profile.');
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL pathname
  const currentPath = location.pathname.replace(/\/$/, '');
  let activeTab: TabKey = 'overview';
  if (currentPath === '/account/bookings') activeTab = 'bookings';
  else if (currentPath === '/account/documents') activeTab = 'documents';
  else if (currentPath === '/account/profile') activeTab = 'profile';
  else if (currentPath === '/account/security') activeTab = 'security';

  const handleTabChange = (key: TabKey) => {
    const tabObj = TABS.find((t) => t.key === key);
    if (tabObj) {
      navigate(tabObj.path);
    }
  };

  return (
    <>
      <PageHead
        title="My account"
        lead={`Welcome, ${profile?.name || user?.email || 'Driver'}. Manage your bookings and documents.`}
      />

      <section style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
        <div className="wrap">
          {/* Top Bar: User Profile Summary & Logout */}
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
                {(profile?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    {profile?.name || 'Glivva Member'}
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
                    {profile?.role || 'User'}
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
            aria-label="Account sections"
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
            {activeTab === 'overview' && (
              <AccountOverview onNavigate={(k) => handleTabChange(k)} />
            )}
            {activeTab === 'bookings' && <AccountBookings />}
            {activeTab === 'documents' && <AccountDocuments />}
            {activeTab === 'profile' && <AccountProfile />}
            {activeTab === 'security' && <AccountSecurity />}
          </div>
        </div>
      </section>
    </>
  );
}
