import PageHead from '../../components/PageHead';
import { useMeta } from '../../lib/useMeta';
import { useAuth } from '../../lib/auth';

export default function StaffHome() {
  useMeta('Staff Portal | Glivva Car Rentals', 'Operations and fleet management.');
  const { user, profile, signOut } = useAuth();

  return (
    <>
      <PageHead
        title="Staff portal"
        lead={`Operational desk for ${profile?.name || user?.email || 'Operations Officer'}.`}
      />
      <section style={{ paddingTop: '1.5rem' }}>
        <div className="wrap">
          <div className="grid g3">
            <div className="card">
              <div className="ico">📞</div>
              <h3>Call queue</h3>
              <p>Real-time incoming customer booking requests, SLA timers, and call outcomes.</p>
            </div>
            <div className="card">
              <div className="ico">📋</div>
              <h3>Handover logs</h3>
              <p>Pickup and return inspection records, odometer readings, and vehicle damage photos.</p>
            </div>
            <div className="card">
              <div className="ico">🚗</div>
              <h3>Fleet status</h3>
              <p>Vehicle compliance documents, service alerts, and availability blocks.</p>
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
