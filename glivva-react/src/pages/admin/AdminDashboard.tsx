import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { inr, formatDateTimeIST } from '../../lib/format';

interface DashboardKpis {
  pending_bookings: number;
  confirmed_bookings: number;
  active_bookings: number;
  booked_value: number;
}

interface RecentBookingSummary {
  id: string;
  ref: string;
  total: number;
  status: string;
  created_at: string;
  customer_name?: string;
  car_name?: string;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<DashboardKpis>({
    pending_bookings: 0,
    confirmed_bookings: 0,
    active_bookings: 0,
    booked_value: 0,
  });
  const [totalFleet, setTotalFleet] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [recentBookings, setRecentBookings] = useState<RecentBookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setError(null);
    try {
      const [kpiRes, carsRes, usersRes, recentRes] = await Promise.all([
        supabase.from('v_dashboard_kpis').select('*').maybeSingle(),
        supabase.from('cars').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
        supabase
          .from('bookings')
          .select(`
            id,
            ref,
            total,
            status,
            created_at,
            customer:profiles(name),
            car:cars(name)
          `)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      if (kpiRes.error) throw kpiRes.error;
      if (kpiRes.data) {
        setKpis({
          pending_bookings: Number(kpiRes.data.pending_bookings || 0),
          confirmed_bookings: Number(kpiRes.data.confirmed_bookings || 0),
          active_bookings: Number(kpiRes.data.active_bookings || 0),
          booked_value: Number(kpiRes.data.booked_value || 0),
        });
      }

      setTotalFleet(carsRes.count || 0);
      setTotalUsers(usersRes.count || 0);

      const formattedRecent: RecentBookingSummary[] = (recentRes.data || []).map((b) => {
        const cust = b.customer as unknown as { name: string } | { name: string }[] | null;
        const car = b.car as unknown as { name: string } | { name: string }[] | null;
        return {
          id: b.id,
          ref: b.ref,
          total: Number(b.total),
          status: b.status,
          created_at: b.created_at,
          customer_name: Array.isArray(cust) ? cust[0]?.name : cust?.name,
          car_name: Array.isArray(car) ? car[0]?.name : car?.name,
        };
      });

      setRecentBookings(formattedRecent);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load executive KPIs.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data, error: exportErr } = await supabase
        .from('bookings')
        .select(`
          ref,
          pickup_place,
          period,
          driver_option,
          subtotal,
          tax,
          total,
          status,
          created_at,
          customer:profiles(name, phone),
          car:cars(name, slug, category)
        `)
        .order('created_at', { ascending: false });

      if (exportErr) throw exportErr;

      const headers = [
        'Reference',
        'Customer Name',
        'Customer Phone',
        'Vehicle',
        'Category',
        'Pickup Location',
        'Total (INR)',
        'Status',
        'Created Date (IST)',
      ];

      const rows = (data || []).map((b) => {
        const cust = b.customer as unknown as { name: string; phone: string } | { name: string; phone: string }[] | null;
        const car = b.car as unknown as { name: string; slug: string; category: string } | { name: string; slug: string; category: string }[] | null;
        const cName = Array.isArray(cust) ? cust[0]?.name : cust?.name;
        const cPhone = Array.isArray(cust) ? cust[0]?.phone : cust?.phone;
        const carName = Array.isArray(car) ? car[0]?.name : car?.name;
        const carCat = Array.isArray(car) ? car[0]?.category : car?.category;

        return [
          `"${b.ref}"`,
          `"${cName || 'Guest'}"`,
          `"${cPhone || ''}"`,
          `"${carName || ''}"`,
          `"${carCat || ''}"`,
          `"${b.pickup_place || ''}"`,
          b.total,
          `"${b.status}"`,
          `"${formatDateTimeIST(b.created_at)}"`,
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `glivva_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export CSV.';
      setError(msg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Top Header & Export Action */}
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Executive KPI Dashboard</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Real-time business telemetry, revenue metrics, active fleet volume, and booking trends.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="btn"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--line)',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>📥</span>
          <span>{exporting ? 'Generating CSV...' : 'Export Bookings CSV'}</span>
        </button>
      </div>

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid g4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--gold)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>
            Booked Gross Value
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.25rem' }}>
            {inr(kpis.booked_value)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginTop: '0.25rem' }}>
            Confirmed + Active + Completed
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>
            Active Trips On Road
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
            {kpis.active_bookings}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginTop: '0.25rem' }}>
            Currently dispatched vehicles
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid #4ade80' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>
            Confirmed Bookings
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>
            {kpis.confirmed_bookings}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginTop: '0.25rem' }}>
            Ready for vehicle handover
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid #f87171' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>
            Pending Call Queue
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: kpis.pending_bookings > 0 ? '#f87171' : 'var(--text)', marginTop: '0.25rem' }}>
            {kpis.pending_bookings}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginTop: '0.25rem' }}>
            Requires operator call verification
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid g3" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>Total Fleet Volume</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{totalFleet} Vehicles</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', marginTop: '0.2rem' }}>
            Operating across Jharkhand & Odisha
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>Registered Drivers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{totalUsers} Members</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', marginTop: '0.2rem' }}>
            Verified customer driver profiles
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>SLA Target</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80', marginTop: '0.25rem' }}>&lt; 15 Mins</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', marginTop: '0.2rem' }}>
            Target response for pending booking calls
          </div>
        </div>
      </div>

      {/* Recent Bookings Activity Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Recent Booking Activity</h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mute)' }}>Loading activity...</div>
        ) : recentBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mute)' }}>No recent bookings recorded.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--mute)' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Ref</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Customer</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Vehicle</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Total</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Created (IST)</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 700, color: 'var(--gold)' }}>{b.ref}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{b.customer_name || 'Guest Booker'}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>{b.car_name || 'Unassigned'}</td>
                    <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{inr(b.total)}</td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          textTransform: 'capitalize',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            b.status === 'confirmed'
                              ? 'rgba(74,222,128,0.15)'
                              : b.status === 'active'
                              ? 'rgba(56,189,248,0.15)'
                              : b.status === 'pending'
                              ? 'rgba(248,113,113,0.15)'
                              : 'rgba(255,255,255,0.08)',
                          color:
                            b.status === 'confirmed'
                              ? '#4ade80'
                              : b.status === 'active'
                              ? '#38bdf8'
                              : b.status === 'pending'
                              ? '#f87171'
                              : 'var(--mute)',
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--mute)' }}>{formatDateTimeIST(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
