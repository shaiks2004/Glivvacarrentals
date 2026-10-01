import { useLocation, useNavigate } from 'react-router-dom';
import PageHead from '../../components/PageHead';
import { useMeta } from '../../lib/useMeta';
import { useAuth } from '../../lib/auth';
import AdminDashboard from './AdminDashboard';
import AdminEmployees from './AdminEmployees';
import AdminOffers from './AdminOffers';
import AdminAuditLogs from './AdminAuditLogs';
import AdminSettings from './AdminSettings';
import AdminNotifications from './AdminNotifications';
import StaffFleet from '../staff/StaffFleet';

type AdminTabKey = 'dashboard' | 'fleet' | 'employees' | 'offers' | 'notifications' | 'audit' | 'settings';

const TABS: Array<{ key: AdminTabKey; label: string; path: string; icon: string }> = [
  { key: 'dashboard', label: 'Executive Dashboard', path: '/admin', icon: '📊' },
  { key: 'fleet', label: 'Fleet & Vehicles', path: '/admin/fleet', icon: '🚗' },
  { key: 'employees', label: 'Employees & Coverage', path: '/admin/employees', icon: '👥' },
  { key: 'offers', label: 'Pricing & Offers', path: '/admin/offers', icon: '🏷️' },
  { key: 'notifications', label: 'Notifications & Gateway', path: '/admin/notifications', icon: '📬' },
  { key: 'audit', label: 'Security Audit Trail', path: '/admin/audit', icon: '🛡️' },
  { key: 'settings', label: 'Settings & Reviews', path: '/admin/settings', icon: '⚙️' },
];

export default function AdminHome() {
  useMeta(
    'Admin Control Center | Glivva Car Rentals',
    'Executive management, vehicle inventory, employee provisioning, KPIs, and audit trails.'
  );
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL pathname
  const currentPath = location.pathname.replace(/\/$/, '');
  let activeTab: AdminTabKey = 'dashboard';
  if (currentPath === '/admin/fleet') activeTab = 'fleet';
  else if (currentPath === '/admin/employees') activeTab = 'employees';
  else if (currentPath === '/admin/offers') activeTab = 'offers';
  else if (currentPath === '/admin/notifications') activeTab = 'notifications';
  else if (currentPath === '/admin/audit') activeTab = 'audit';
  else if (currentPath === '/admin/settings') activeTab = 'settings';

  const handleTabChange = (key: AdminTabKey) => {
    const tabObj = TABS.find((t) => t.key === key);
    if (tabObj) {
      navigate(tabObj.path);
    }
  };

  return (
    <>
      <PageHead
        title="Admin console"
        lead={`Executive console for ${profile?.name || user?.email || 'Administrator'}.`}
      />

      <section style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
        <div className="wrap">
          {/* Top Bar: Admin Profile Summary & Logout */}
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
                {(profile?.name || user?.email || 'A')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    {profile?.name || 'Super Admin'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(226,172,47,0.2)',
                      color: 'var(--gold)',
                      border: '1px solid var(--gold)',
                      fontWeight: 700,
                    }}
                  >
                    Executive Admin
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
            aria-label="Admin console sections"
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
            {activeTab === 'dashboard' && <AdminDashboard />}
            {activeTab === 'fleet' && <StaffFleet />}
            {activeTab === 'employees' && <AdminEmployees />}
            {activeTab === 'offers' && <AdminOffers />}
            {activeTab === 'notifications' && <AdminNotifications />}
            {activeTab === 'audit' && <AdminAuditLogs />}
            {activeTab === 'settings' && <AdminSettings />}
          </div>
        </div>
      </section>
    </>
  );
}
