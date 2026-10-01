import PageHead from '../../components/PageHead';
import { useMeta } from '../../lib/useMeta';
import { useAuth } from '../../lib/auth';

export default function AccountHome() {
  useMeta('My Account | Glivva Car Rentals', 'View your bookings, documents and profile.');
  const { user, profile, signOut } = useAuth();

  return (
    <>
      <PageHead
        title="My account"
        lead={`Welcome back, ${profile?.name || user?.email || 'Driver'}. Manage your bookings and documents.`}
      />
      <section style={{ paddingTop: '1.5rem' }}>
        <div className="wrap">
          <div className="grid g3">
            <div className="card">
              <div className="ico">🚘</div>
              <h3>My bookings</h3>
              <p>View upcoming reservations, booking status timeline, and rental receipts.</p>
            </div>
            <div className="card">
              <div className="ico">📄</div>
              <h3>KYC documents</h3>
              <p>Upload driving license and identity verification documents for instant handover.</p>
            </div>
            <div className="card">
              <div className="ico">👤</div>
              <h3>Profile & security</h3>
              <p>Manage your contact details, emergency contacts, and login credentials.</p>
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
