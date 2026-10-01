import PageHead from '../../components/PageHead';
import { useMeta } from '../../lib/useMeta';
import { useAuth } from '../../lib/auth';

export default function AdminHome() {
  useMeta('Admin Control Center | Glivva Car Rentals', 'Executive management portal.');
  const { user, profile, signOut } = useAuth();

  return (
    <>
      <PageHead
        title="Admin control"
        lead={`Executive management console for ${profile?.name || user?.email || 'Administrator'}.`}
      />
      <section style={{ paddingTop: '1.5rem' }}>
        <div className="wrap">
          <div className="grid g4">
            <div className="card">
              <div className="ico">👥</div>
              <h3>Employees</h3>
              <p>Create staff accounts, assign operational cities, reset passwords, or disable access.</p>
            </div>
            <div className="card">
              <div className="ico">📊</div>
              <h3>Reports & KPIs</h3>
              <p>Fleet utilization, booking revenue, conversion rates, and CSV exports.</p>
            </div>
            <div className="card">
              <div className="ico">🏷️</div>
              <h3>Pricing & offers</h3>
              <p>Dynamic city pricing, seasonal discount codes, and chauffeur rates.</p>
            </div>
            <div className="card">
              <div className="ico">🛡️</div>
              <h3>Audit logs</h3>
              <p>Immutable system activity trail, security audits, and access records.</p>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <button
              onClick={() => signOut()}
              className="btn"
              style={{ borderColor: 'var(--line)', color: 'var(--mute)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
