import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDateTimeIST } from '../../lib/format';

interface EmployeeProfile {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  active: boolean;
  must_change_password: boolean;
  created_at: string;
  assigned_cities?: Array<{ id: number; name: string }>;
}

interface City {
  id: number;
  slug: string;
  name: string;
  state: string | null;
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Provision Modal State
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formCityIds, setFormCityIds] = useState<number[]>([]);
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Manage Cities Modal State
  const [selectedEmpForCities, setSelectedEmpForCities] = useState<EmployeeProfile | null>(null);
  const [cityModalSelected, setCityModalSelected] = useState<number[]>([]);
  const [cityModalLoading, setCityModalLoading] = useState(false);
  const [cityModalError, setCityModalError] = useState<string | null>(null);

  const fetchEmployeesData = async () => {
    setError(null);
    try {
      const [empRes, citiesRes, empCitiesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, phone, role, active, must_change_password, created_at')
          .in('role', ['employee', 'admin'])
          .order('created_at', { ascending: false }),
        supabase.from('cities').select('*').order('name', { ascending: true }),
        supabase
          .from('employee_cities')
          .select(`
            employee_id,
            city_id,
            city:cities(id, name)
          `),
      ]);

      if (empRes.error) throw empRes.error;
      if (citiesRes.error) throw citiesRes.error;

      const cityMap: Record<string, Array<{ id: number; name: string }>> = {};
      (empCitiesRes.data || []).forEach((ec) => {
        const cData = ec.city as unknown as { id: number; name: string } | { id: number; name: string }[] | null;
        const cObj = Array.isArray(cData) ? cData[0] : cData;
        if (cObj) {
          if (!cityMap[ec.employee_id]) cityMap[ec.employee_id] = [];
          cityMap[ec.employee_id].push({ id: cObj.id, name: cObj.name });
        }
      });

      const formatted: EmployeeProfile[] = (empRes.data || []).map((emp) => ({
        ...emp,
        assigned_cities: cityMap[emp.id] || [],
      }));

      setEmployees(formatted);
      setCities(citiesRes.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employees.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  const openProvisionModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormCityIds([]);
    setProvisionError(null);
    setIsProvisionOpen(true);
  };

  const handleCityToggle = (cityId: number) => {
    setFormCityIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]
    );
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setProvisionError('Name, email, and temporary password are required.');
      return;
    }

    if (formPassword.length < 8) {
      setProvisionError('Temporary password must be at least 8 characters long.');
      return;
    }

    setProvisionLoading(true);
    setProvisionError(null);

    try {
      const { error: rpcErr } = await supabase.rpc('admin_provision_employee', {
        p_name: formName.trim(),
        p_email: formEmail.trim(),
        p_phone: formPhone.trim() || null,
        p_password: formPassword,
        p_city_ids: formCityIds,
      });

      if (rpcErr) throw rpcErr;

      setSuccess(`Employee account for ${formName} (${formEmail}) created successfully.`);
      setIsProvisionOpen(false);
      await fetchEmployeesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create employee.';
      setProvisionError(msg);
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleToggleActive = async (emp: EmployeeProfile) => {
    setError(null);
    try {
      const nextActive = !emp.active;
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ active: nextActive })
        .eq('id', emp.id);

      if (updErr) throw updErr;

      setSuccess(`${emp.name} account is now ${nextActive ? 'Active' : 'Disabled'}.`);
      await fetchEmployeesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update employee status.';
      setError(msg);
    }
  };

  const openCityModal = (emp: EmployeeProfile) => {
    setSelectedEmpForCities(emp);
    setCityModalSelected((emp.assigned_cities || []).map((c) => c.id));
    setCityModalError(null);
  };

  const handleSaveAssignedCities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForCities) return;

    setCityModalLoading(true);
    setCityModalError(null);

    try {
      // 1. Remove current assignments
      const { error: delErr } = await supabase
        .from('employee_cities')
        .delete()
        .eq('employee_id', selectedEmpForCities.id);

      if (delErr) throw delErr;

      // 2. Insert new assignments
      if (cityModalSelected.length > 0) {
        const rows = cityModalSelected.map((cid) => ({
          employee_id: selectedEmpForCities.id,
          city_id: cid,
        }));
        const { error: insErr } = await supabase.from('employee_cities').insert(rows);
        if (insErr) throw insErr;
      }

      setSuccess(`Updated city assignments for ${selectedEmpForCities.name}.`);
      setSelectedEmpForCities(null);
      await fetchEmployeesData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update assigned cities.';
      setCityModalError(msg);
    } finally {
      setCityModalLoading(false);
    }
  };

  return (
    <div>
      {/* Top Header */}
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Employee Management</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Provision operational staff, assign coverage cities, and manage operational permissions.
          </p>
        </div>

        <button
          onClick={openProvisionModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>➕</span>
          <span>Provision New Employee</span>
        </button>
      </div>

      {success && (
        <div className="ok" role="status" style={{ marginBottom: '1.25rem' }}>
          {success}
        </div>
      )}

      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Employees Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading employee records...
        </div>
      ) : employees.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          No employee records found.
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', color: 'var(--mute)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Employee Name</th>
                <th style={{ padding: '0.85rem 1rem' }}>Phone</th>
                <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                <th style={{ padding: '0.85rem 1rem' }}>Assigned Cities</th>
                <th style={{ padding: '0.85rem 1rem' }}>Account Status</th>
                <th style={{ padding: '0.85rem 1rem' }}>Provisioned (IST)</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>👤</span>
                      <span>{emp.name || 'Staff Member'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--mute)' }}>{emp.phone || 'No phone set'}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: emp.role === 'admin' ? 'rgba(226,172,47,0.15)' : 'rgba(56,189,248,0.15)',
                        color: emp.role === 'admin' ? 'var(--gold)' : '#38bdf8',
                        fontWeight: 600,
                      }}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {emp.assigned_cities && emp.assigned_cities.length > 0 ? (
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {emp.assigned_cities.map((c) => (
                          <span
                            key={c.id}
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--bg)',
                              border: '1px solid var(--line)',
                            }}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--mute)', fontSize: '0.8rem' }}>All / Unrestricted</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: emp.active ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
                        color: emp.active ? '#4ade80' : '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      {emp.active ? 'Active' : 'Disabled'}
                    </span>
                    {emp.must_change_password && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--gold)', marginLeft: '0.5rem' }}>
                        (Temp Password)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--mute)' }}>
                    {formatDateTimeIST(emp.created_at)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => openCityModal(emp)}
                        className="btn btn-sm"
                        style={{ background: 'var(--bg)', borderColor: 'var(--line)', fontSize: '0.75rem' }}
                      >
                        Cities
                      </button>
                      {emp.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleActive(emp)}
                          className="btn btn-sm"
                          style={{
                            background: 'transparent',
                            borderColor: 'var(--line)',
                            color: emp.active ? '#f87171' : '#4ade80',
                            fontSize: '0.75rem',
                          }}
                        >
                          {emp.active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Provision Employee Modal */}
      {isProvisionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="provision-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="provision-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                Provision Employee Account
              </h3>
              <button
                onClick={() => setIsProvisionOpen(false)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '1.25rem' }}>
              Employee accounts are created with a temporary password and forced to change password upon first login.
            </p>

            {provisionError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {provisionError}
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div className="grid g2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. anand@glivva.in"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Mobile Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Initial Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Min 8 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    color: 'var(--text)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Assigned Operational Cities
                </label>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                  }}
                >
                  {cities.map((city) => (
                    <label
                      key={city.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formCityIds.includes(city.id)}
                        onChange={() => handleCityToggle(city.id)}
                      />
                      <span>{city.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="btn"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={provisionLoading} className="btn btn-primary">
                  {provisionLoading ? 'Creating Account...' : 'Provision Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Assigned Cities Modal */}
      {selectedEmpForCities && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="city-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="city-modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                Coverage: {selectedEmpForCities.name}
              </h3>
              <button
                onClick={() => setSelectedEmpForCities(null)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {cityModalError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {cityModalError}
              </div>
            )}

            <form onSubmit={handleSaveAssignedCities}>
              <p style={{ fontSize: '0.85rem', color: 'var(--mute)', marginBottom: '1rem' }}>
                Select the operational cities assigned to this staff member:
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  padding: '0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  marginBottom: '1.25rem',
                }}
              >
                {cities.map((city) => (
                  <label
                    key={city.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={cityModalSelected.includes(city.id)}
                      onChange={() => {
                        setCityModalSelected((prev) =>
                          prev.includes(city.id) ? prev.filter((id) => id !== city.id) : [...prev, city.id]
                        );
                      }}
                    />
                    <span>{city.name} ({city.state})</span>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedEmpForCities(null)}
                  className="btn btn-sm"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={cityModalLoading} className="btn btn-sm btn-primary">
                  {cityModalLoading ? 'Saving...' : 'Save Coverage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
