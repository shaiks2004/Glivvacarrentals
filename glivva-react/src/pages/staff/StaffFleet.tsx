import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { inr, formatDateTimeIST } from '../../lib/format';

interface Car {
  id: number;
  slug: string;
  name: string;
  category: 'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'Luxury';
  seats: number;
  fuel: string;
  transmission: string;
  price_per_day: number;
  city_id: number | null;
  reg_number: string | null;
  photo_urls: string[];
  active: boolean;
  city?: { id: number; name: string; state: string } | null;
}

interface CarCompliance {
  car_id: number;
  slug: string;
  name: string;
  document_count: number;
  expired_count: number;
  expiring_count: number;
  bookable: boolean;
}

interface City {
  id: number;
  slug: string;
  name: string;
  state: string | null;
}

interface CarDocument {
  id?: string;
  car_id: number;
  type: 'insurance' | 'puc' | 'rc' | 'fitness' | 'road_tax' | 'permit';
  number: string | null;
  issue_date: string | null;
  expiry_date: string;
  file_path?: string | null;
}

interface CarBlock {
  id: string;
  car_id: number;
  period: string;
  reason: 'maintenance' | 'reserved' | 'other';
  notes: string | null;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { key: 'rc', label: 'Registration Certificate (RC)' },
  { key: 'insurance', label: 'Commercial Insurance Policy' },
  { key: 'puc', label: 'Pollution Under Control (PUC)' },
  { key: 'fitness', label: 'Fitness Certificate' },
  { key: 'permit', label: 'All India / State Permit' },
  { key: 'road_tax', label: 'Road Tax Receipt' },
] as const;

export default function StaffFleet() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [cars, setCars] = useState<Car[]>([]);
  const [complianceMap, setComplianceMap] = useState<Record<number, CarCompliance>>({});
  const [cities, setCities] = useState<City[]>([]);
  const [activeBookingsMap, setActiveBookingsMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked' | 'archived'>('all');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'compliant' | 'action_needed'>('all');

  // Add / Edit Modal State
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [carFormName, setCarFormName] = useState('');
  const [carFormSlug, setCarFormSlug] = useState('');
  const [carFormCategory, setCarFormCategory] = useState<'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'Luxury'>('Sedan');
  const [carFormSeats, setCarFormSeats] = useState(5);
  const [carFormFuel, setCarFormFuel] = useState('Petrol');
  const [carFormTransmission, setCarFormTransmission] = useState('Manual');
  const [carFormPrice, setCarFormPrice] = useState(2500);
  const [carFormCityId, setCarFormCityId] = useState<number | ''>('');
  const [carFormRegNumber, setCarFormRegNumber] = useState('');
  const [carFormActive, setCarFormActive] = useState(true);
  const [carPhotoUrls, setCarPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [carModalLoading, setCarModalLoading] = useState(false);
  const [carModalError, setCarModalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation Modal State
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Documents & Compliance Modal State
  const [selectedCarForDocs, setSelectedCarForDocs] = useState<Car | null>(null);
  const [carDocs, setCarDocs] = useState<CarDocument[]>([]);
  const [editingDocType, setEditingDocType] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState('');
  const [docIssueDate, setDocIssueDate] = useState('');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Car Blocks Modal State
  const [selectedCarForBlocks, setSelectedCarForBlocks] = useState<Car | null>(null);
  const [carBlocks, setCarBlocks] = useState<CarBlock[]>([]);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState<'maintenance' | 'reserved' | 'other'>('maintenance');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const fetchFleetData = async () => {
    setError(null);
    try {
      const [carsRes, citiesRes, compRes, activeBookingsRes] = await Promise.all([
        supabase
          .from('cars')
          .select(`
            id,
            slug,
            name,
            category,
            seats,
            fuel,
            transmission,
            price_per_day,
            city_id,
            reg_number,
            photo_urls,
            active,
            city:cities (
              id,
              name,
              state
            )
          `)
          .order('id', { ascending: true }),
        supabase.from('cities').select('*').order('name', { ascending: true }),
        supabase.from('car_compliance').select('*'),
        supabase
          .from('bookings')
          .select('car_id')
          .in('status', ['confirmed', 'active']),
      ]);

      if (carsRes.error) throw carsRes.error;
      if (citiesRes.error) throw citiesRes.error;

      const formattedCars: Car[] = (carsRes.data || []).map((c) => {
        const cityData = c.city as unknown as
          | { id: number; name: string; state: string }
          | { id: number; name: string; state: string }[]
          | null;
        return {
          ...c,
          city: Array.isArray(cityData) ? cityData[0] : cityData,
          photo_urls: Array.isArray(c.photo_urls) ? c.photo_urls : [],
        };
      });

      setCars(formattedCars);
      setCities(citiesRes.data || []);

      if (compRes.data) {
        const cMap: Record<number, CarCompliance> = {};
        compRes.data.forEach((row: CarCompliance) => {
          cMap[row.car_id] = row;
        });
        setComplianceMap(cMap);
      }

      if (activeBookingsRes.data) {
        const bMap: Record<number, boolean> = {};
        activeBookingsRes.data.forEach((b: { car_id: number }) => {
          bMap[b.car_id] = true;
        });
        setActiveBookingsMap(bMap);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load fleet data.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  const openAddCarModal = () => {
    setEditingCar(null);
    setCarFormName('');
    setCarFormSlug('');
    setCarFormCategory('Sedan');
    setCarFormSeats(5);
    setCarFormFuel('Petrol');
    setCarFormTransmission('Manual');
    setCarFormPrice(2500);
    setCarFormCityId(cities[0]?.id || '');
    setCarFormRegNumber('');
    setCarFormActive(true);
    setCarPhotoUrls([]);
    setCarModalError(null);
    setIsCarModalOpen(true);
  };

  const openEditCarModal = (car: Car) => {
    setEditingCar(car);
    setCarFormName(car.name);
    setCarFormSlug(car.slug);
    setCarFormCategory(car.category);
    setCarFormSeats(car.seats);
    setCarFormFuel(car.fuel);
    setCarFormTransmission(car.transmission);
    setCarFormPrice(Number(car.price_per_day));
    setCarFormCityId(car.city_id || '');
    setCarFormRegNumber(car.reg_number || '');
    setCarFormActive(car.active);
    setCarPhotoUrls(car.photo_urls || []);
    setCarModalError(null);
    setIsCarModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setCarFormName(val);
    if (!editingCar && !carFormSlug) {
      const slugGen = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setCarFormSlug(slugGen);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCarModalError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    setUploadingPhoto(true);
    setCarModalError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${carFormSlug || 'car'}_${Date.now()}.${fileExt}`;
      const filePath = `cars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fleet')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('fleet')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        setCarPhotoUrls((prev) => [publicUrlData.publicUrl, ...prev]);
        setSuccess('Car image uploaded successfully.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo.';
      setCarModalError(msg);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarModalLoading(true);
    setCarModalError(null);

    const slugClean = carFormSlug.trim().toLowerCase();
    if (!slugClean) {
      setCarModalError('Slug identifier is required.');
      setCarModalLoading(false);
      return;
    }

    if (!carFormName.trim()) {
      setCarModalError('Vehicle name is required.');
      setCarModalLoading(false);
      return;
    }

    if (Number(carFormPrice) <= 0) {
      setCarModalError('Daily rental price must be greater than 0.');
      setCarModalLoading(false);
      return;
    }

    try {
      if (editingCar) {
        // Update existing car
        const { error: updErr } = await supabase
          .from('cars')
          .update({
            name: carFormName.trim(),
            slug: slugClean,
            category: carFormCategory,
            seats: Number(carFormSeats),
            fuel: carFormFuel,
            transmission: carFormTransmission,
            price_per_day: Number(carFormPrice),
            city_id: carFormCityId ? Number(carFormCityId) : null,
            reg_number: carFormRegNumber.trim() || null,
            photo_urls: carPhotoUrls,
            active: carFormActive,
          })
          .eq('id', editingCar.id);

        if (updErr) throw updErr;
        setSuccess(`Vehicle "${carFormName}" updated successfully in Supabase.`);
      } else {
        // Insert new car
        const { error: insErr } = await supabase.from('cars').insert({
          name: carFormName.trim(),
          slug: slugClean,
          category: carFormCategory,
          seats: Number(carFormSeats),
          fuel: carFormFuel,
          transmission: carFormTransmission,
          price_per_day: Number(carFormPrice),
          city_id: carFormCityId ? Number(carFormCityId) : null,
          reg_number: carFormRegNumber.trim() || null,
          photo_urls: carPhotoUrls,
          active: carFormActive,
        });

        if (insErr) throw insErr;
        setSuccess(`New vehicle "${carFormName}" added to production fleet.`);
      }

      setIsCarModalOpen(false);
      await fetchFleetData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save vehicle.';
      setCarModalError(msg);
    } finally {
      setCarModalLoading(false);
    }
  };

  const handleToggleActive = async (car: Car) => {
    setError(null);
    try {
      const nextActive = !car.active;
      const { error: updErr } = await supabase
        .from('cars')
        .update({ active: nextActive })
        .eq('id', car.id);

      if (updErr) throw updErr;
      setSuccess(`${car.name} status changed to ${nextActive ? 'AVAILABLE (Active)' : 'UNAVAILABLE (Archived)'}.`);
      await fetchFleetData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      setError(msg);
    }
  };

  const openDeleteModal = (car: Car) => {
    setCarToDelete(car);
    setDeleteError(null);
  };

  const confirmDeleteCar = async () => {
    if (!carToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const { error: delErr } = await supabase
        .from('cars')
        .delete()
        .eq('id', carToDelete.id);

      if (delErr) {
        if (delErr.code === '23503' || delErr.message.includes('foreign key')) {
          throw new Error(
            `Vehicle "${carToDelete.name}" has associated bookings or documents and cannot be permanently deleted. You can Archive it instead.`
          );
        }
        throw delErr;
      }

      setSuccess(`Vehicle "${carToDelete.name}" deleted permanently from fleet.`);
      setCarToDelete(null);
      await fetchFleetData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete vehicle.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Compliance Modal
  const openDocsModal = async (car: Car) => {
    setSelectedCarForDocs(car);
    setEditingDocType(null);
    setDocError(null);
    setDocLoading(true);

    try {
      const { data, error: docsErr } = await supabase
        .from('car_documents')
        .select('*')
        .eq('car_id', car.id);

      if (docsErr) throw docsErr;
      setCarDocs((data || []) as CarDocument[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch car documents.';
      setDocError(msg);
    } finally {
      setDocLoading(false);
    }
  };

  const handleSaveDoc = async (type: string) => {
    if (!selectedCarForDocs) return;
    if (!docExpiryDate) {
      setDocError('Expiry date is mandatory.');
      return;
    }

    setDocLoading(true);
    setDocError(null);

    try {
      const { error: upsertErr } = await supabase.from('car_documents').upsert(
        {
          car_id: selectedCarForDocs.id,
          type,
          number: docNumber.trim() || null,
          issue_date: docIssueDate || null,
          expiry_date: docExpiryDate,
        },
        { onConflict: 'car_id,type' }
      );

      if (upsertErr) throw upsertErr;

      setSuccess(`Updated ${type} document for ${selectedCarForDocs.name}.`);
      setEditingDocType(null);
      setDocNumber('');
      setDocIssueDate('');
      setDocExpiryDate('');

      const { data: updatedDocs } = await supabase
        .from('car_documents')
        .select('*')
        .eq('car_id', selectedCarForDocs.id);
      setCarDocs((updatedDocs || []) as CarDocument[]);
      await fetchFleetData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save document.';
      setDocError(msg);
    } finally {
      setDocLoading(false);
    }
  };

  // Open Blocks / Maintenance Modal
  const openBlocksModal = async (car: Car) => {
    setSelectedCarForBlocks(car);
    setBlockError(null);
    setBlockLoading(true);
    setBlockStart('');
    setBlockEnd('');
    setBlockReason('maintenance');
    setBlockNotes('');

    try {
      const { data, error: blockErr } = await supabase
        .from('car_blocks')
        .select('*')
        .eq('car_id', car.id)
        .order('created_at', { ascending: false });

      if (blockErr) throw blockErr;
      setCarBlocks((data || []) as CarBlock[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch car blocks.';
      setBlockError(msg);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarForBlocks) return;

    if (!blockStart || !blockEnd) {
      setBlockError('Please specify start and end dates.');
      return;
    }

    const startDate = new Date(blockStart);
    const endDate = new Date(blockEnd);

    if (startDate >= endDate) {
      setBlockError('End time must be after start time.');
      return;
    }

    setBlockLoading(true);
    setBlockError(null);

    try {
      const periodRange = `[${startDate.toISOString()},${endDate.toISOString()}]`;

      const { error: insErr } = await supabase.from('car_blocks').insert({
        car_id: selectedCarForBlocks.id,
        period: periodRange,
        reason: blockReason,
        notes: blockNotes.trim() || null,
      });

      if (insErr) throw insErr;

      setSuccess(`Maintenance block added for ${selectedCarForBlocks.name}.`);
      setBlockStart('');
      setBlockEnd('');
      setBlockNotes('');

      const { data: updatedBlocks } = await supabase
        .from('car_blocks')
        .select('*')
        .eq('car_id', selectedCarForBlocks.id)
        .order('created_at', { ascending: false });

      setCarBlocks((updatedBlocks || []) as CarBlock[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create block.';
      setBlockError(msg);
    } finally {
      setBlockLoading(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!selectedCarForBlocks) return;
    setBlockLoading(true);
    setBlockError(null);

    try {
      const { error: delErr } = await supabase
        .from('car_blocks')
        .delete()
        .eq('id', blockId);

      if (delErr) throw delErr;

      setSuccess('Block released.');
      setCarBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove block.';
      setBlockError(msg);
    } finally {
      setBlockLoading(false);
    }
  };

  const getCarStatus = (car: Car): { label: string; color: string; bg: string } => {
    if (!car.active) {
      return { label: 'UNAVAILABLE (Archived)', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
    }
    if (activeBookingsMap[car.id]) {
      return { label: 'BOOKED (On Trip)', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    }
    return { label: 'AVAILABLE', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' };
  };

  const filteredCars = cars.filter((c) => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (statusFilter === 'available' && (!c.active || activeBookingsMap[c.id])) return false;
    if (statusFilter === 'booked' && (!c.active || !activeBookingsMap[c.id])) return false;
    if (statusFilter === 'archived' && c.active) return false;

    const comp = complianceMap[c.id];
    if (complianceFilter === 'compliant') {
      if (!comp || !comp.bookable) return false;
    } else if (complianceFilter === 'action_needed') {
      if (comp && comp.bookable && comp.expiring_count === 0) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchSlug = c.slug.toLowerCase().includes(q);
      const matchReg = (c.reg_number || '').toLowerCase().includes(q);
      const matchCity = (c.city?.name || '').toLowerCase().includes(q);
      return matchName || matchSlug || matchReg || matchCity;
    }

    return true;
  });

  const totalCars = cars.length;
  const availableCount = cars.filter((c) => c.active && !activeBookingsMap[c.id]).length;
  const bookedCount = cars.filter((c) => c.active && activeBookingsMap[c.id]).length;
  const compliantCars = Object.values(complianceMap).filter((c) => c.bookable && c.expiring_count === 0).length;

  return (
    <div>
      {/* Header & Actions */}
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
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Fleet & Vehicle Inventory</h2>
          <p style={{ color: 'var(--mute)', fontSize: '0.9rem' }}>
            Production car management: create, edit, delete, photo uploads, compliance, and real-time status.
          </p>
        </div>

        <button
          onClick={openAddCarModal}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span>➕</span>
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid g4" style={{ marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>Total Vehicles</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.25rem' }}>
            {totalCars}
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>Available For Rent</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#4ade80', marginTop: '0.25rem' }}>
            {availableCount}
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>Active / Booked</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
            {bookedCount}
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--mute)', textTransform: 'uppercase' }}>Fully Compliant</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
            {compliantCars}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <input
            type="search"
            placeholder="Search vehicle name, plate, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
              minWidth: '220px',
            }}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
            }}
          >
            <option value="all">All Categories</option>
            <option value="Hatchback">Hatchback</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="MPV">MPV</option>
            <option value="Luxury">Luxury</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'available' | 'booked' | 'archived')}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
            }}
          >
            <option value="all">All Status</option>
            <option value="available">Available Only</option>
            <option value="booked">Booked Only</option>
            <option value="archived">Archived Only</option>
          </select>

          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value as 'all' | 'compliant' | 'action_needed')}
            style={{
              padding: '0.45rem 0.85rem',
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.85rem',
            }}
          >
            <option value="all">All Compliance Status</option>
            <option value="compliant">Compliant Only</option>
            <option value="action_needed">Action Needed</option>
          </select>
        </div>
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

      {/* Fleet Catalog List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--mute)' }}>
          Loading production fleet inventory from Supabase...
        </div>
      ) : filteredCars.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--mute)' }}>
          <h3>No vehicles found</h3>
          <p style={{ marginTop: '0.5rem' }}>
            The production fleet inventory is currently empty or filtered. Click "Add New Vehicle" above to create a car.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredCars.map((car) => {
            const comp = complianceMap[car.id];
            const isCompliant = comp ? comp.bookable && comp.expiring_count === 0 : false;
            const isExpiring = comp ? comp.expiring_count > 0 && comp.expired_count === 0 : false;
            const statusInfo = getCarStatus(car);
            const carPhoto = car.photo_urls && car.photo_urls.length > 0 ? car.photo_urls[0] : null;

            return (
              <div
                key={car.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  borderColor: car.active ? 'var(--line)' : 'rgba(255,255,255,0.05)',
                  opacity: car.active ? 1 : 0.75,
                }}
              >
                {/* Left: Photo & Specs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '56px',
                      borderRadius: '8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.75rem',
                    }}
                  >
                    {carPhoto ? (
                      <img
                        src={carPhoto}
                        alt={car.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      '🚗'
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>{car.name}</h3>
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
                        {car.category}
                      </span>
                      {car.reg_number && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'var(--bg)',
                            border: '1px solid var(--line)',
                            color: 'var(--text)',
                          }}
                        >
                          {car.reg_number}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--mute)', marginTop: '0.35rem' }}>
                      {car.seats} Seats • {car.fuel} • {car.transmission} • {car.city?.name || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Middle: Price, Status & Compliance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--mute)' }}>Daily Rate</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {inr(car.price_per_day)} <span style={{ fontSize: '0.75rem', color: 'var(--mute)' }}>/ day</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.2rem' }}>Availability Status</div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: statusInfo.bg,
                        color: statusInfo.color,
                        fontWeight: 700,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.2rem' }}>Compliance</div>
                    <div>
                      {isCompliant ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(74,222,128,0.15)',
                            color: '#4ade80',
                            fontWeight: 600,
                          }}
                        >
                          ✓ Compliant
                        </span>
                      ) : isExpiring ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(248,214,125,0.15)',
                            color: 'var(--gold)',
                            fontWeight: 600,
                          }}
                        >
                          ⚠ Expiring ({comp?.expiring_count})
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(248,113,113,0.15)',
                            color: '#f87171',
                            fontWeight: 600,
                          }}
                        >
                          ✕ Incomplete ({comp ? `${comp.document_count}/6` : '0/6'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => openDocsModal(car)}
                    className="btn btn-sm"
                    style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
                    title="Manage statutory compliance documents"
                  >
                    📄 Docs
                  </button>
                  <button
                    onClick={() => openBlocksModal(car)}
                    className="btn btn-sm"
                    style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
                    title="Manage vehicle maintenance locks"
                  >
                    🔒 Locks
                  </button>
                  <button
                    onClick={() => openEditCarModal(car)}
                    className="btn btn-sm"
                    style={{ background: 'var(--bg)', borderColor: 'var(--line)', color: 'var(--text)' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(car)}
                    className="btn btn-sm"
                    style={{
                      background: 'transparent',
                      borderColor: 'var(--line)',
                      color: car.active ? '#f87171' : '#4ade80',
                    }}
                  >
                    {car.active ? 'Archive' : 'Activate'}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => openDeleteModal(car)}
                      className="btn btn-sm"
                      style={{
                        background: 'transparent',
                        borderColor: '#ef4444',
                        color: '#ef4444',
                      }}
                      title="Permanently remove vehicle"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {isCarModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="car-modal-title"
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
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 id="car-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                {editingCar ? `Edit ${editingCar.name}` : 'Add New Vehicle to Fleet'}
              </h3>
              <button
                onClick={() => setIsCarModalOpen(false)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {carModalError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {carModalError}
              </div>
            )}

            <form onSubmit={handleCarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maruti Suzuki Swift"
                  value={carFormName}
                  onChange={(e) => handleNameChange(e.target.value)}
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
                    Slug (URL Key) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. swift"
                    value={carFormSlug}
                    onChange={(e) => setCarFormSlug(e.target.value)}
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
                    Registration Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JH-01-BK-4521"
                    value={carFormRegNumber}
                    onChange={(e) => setCarFormRegNumber(e.target.value)}
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

              <div className="grid g2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Category *
                  </label>
                  <select
                    value={carFormCategory}
                    onChange={(e) => setCarFormCategory(e.target.value as 'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'Luxury')}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  >
                    <option value="Hatchback">Hatchback</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="MPV">MPV</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Seating Capacity *
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="12"
                    required
                    value={carFormSeats}
                    onChange={(e) => setCarFormSeats(Number(e.target.value))}
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

              <div className="grid g2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Fuel Type *
                  </label>
                  <select
                    value={carFormFuel}
                    onChange={(e) => setCarFormFuel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Transmission *
                  </label>
                  <select
                    value={carFormTransmission}
                    onChange={(e) => setCarFormTransmission(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  >
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>
              </div>

              <div className="grid g2">
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                    Price Per Day (INR) *
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    required
                    value={carFormPrice}
                    onChange={(e) => setCarFormPrice(Number(e.target.value))}
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
                    Operational City
                  </label>
                  <select
                    value={carFormCityId}
                    onChange={(e) => setCarFormCityId(e.target.value ? Number(e.target.value) : '')}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      color: 'var(--text)',
                    }}
                  >
                    <option value="">Unassigned</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} ({city.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Upload Section */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--mute)' }}>
                  Vehicle Photo (Supabase Storage)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    style={{ fontSize: '0.85rem', color: 'var(--mute)' }}
                  />
                  {uploadingPhoto && <span style={{ fontSize: '0.8rem', color: 'var(--gold)' }}>Uploading to Storage...</span>}
                </div>
                {carPhotoUrls.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {carPhotoUrls.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img
                          src={url}
                          alt="preview"
                          style={{
                            width: '80px',
                            height: '55px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid var(--line)',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setCarPhotoUrls((prev) => prev.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          aria-label="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="car-active-chk"
                  checked={carFormActive}
                  onChange={(e) => setCarFormActive(e.target.checked)}
                />
                <label htmlFor="car-active-chk" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  Vehicle is active and available for customer bookings
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCarModalOpen(false)}
                  className="btn"
                  style={{ background: 'transparent', borderColor: 'var(--line)', color: 'var(--mute)' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={carModalLoading} className="btn btn-primary">
                  {carModalLoading ? 'Saving...' : editingCar ? 'Save Changes' : 'Create Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {carToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1100,
          }}
        >
          <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: '#f87171', marginBottom: '0.75rem' }}>
              Delete Vehicle?
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete <strong>{carToDelete.name}</strong> ({carToDelete.slug})? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCarToDelete(null)}
                className="btn"
                style={{ background: 'transparent', borderColor: 'var(--line)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCar}
                disabled={deleteLoading}
                className="btn"
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compliance & Documents Modal */}
      {selectedCarForDocs && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="docs-modal-title"
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 id="docs-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Compliance: {selectedCarForDocs.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--mute)', margin: '0.2rem 0 0 0' }}>
                  6 statutory compliance documents required under MVA regulations.
                </p>
              </div>
              <button
                onClick={() => setSelectedCarForDocs(null)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {docError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {docError}
              </div>
            )}

            {docLoading && !editingDocType ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mute)' }}>Loading documents...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {DOCUMENT_TYPES.map((dt) => {
                  const existing = carDocs.find((d) => d.type === dt.key);
                  const isEditingThis = editingDocType === dt.key;

                  let isExpired = false;
                  let isExpSoon = false;
                  if (existing?.expiry_date) {
                    const today = new Date();
                    const exp = new Date(existing.expiry_date);
                    const diffDays = (exp.getTime() - today.getTime()) / (1000 * 3600 * 24);
                    if (diffDays < 0) isExpired = true;
                    else if (diffDays <= 30) isExpSoon = true;
                  }

                  return (
                    <div
                      key={dt.key}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{dt.label}</div>
                          {existing ? (
                            <div style={{ fontSize: '0.8rem', color: 'var(--mute)', marginTop: '0.25rem' }}>
                              Number: {existing.number || 'N/A'} • Expiry: {existing.expiry_date}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '0.25rem' }}>
                              Missing document
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {existing ? (
                            isExpired ? (
                              <span style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>Expired</span>
                            ) : isExpSoon ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>Expiring Soon</span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Valid</span>
                            )
                          ) : null}

                          <button
                            onClick={() => {
                              if (isEditingThis) {
                                setEditingDocType(null);
                              } else {
                                setEditingDocType(dt.key);
                                setDocNumber(existing?.number || '');
                                setDocIssueDate(existing?.issue_date || '');
                                setDocExpiryDate(existing?.expiry_date || '');
                              }
                            }}
                            className="btn btn-sm"
                            style={{ background: 'var(--card)', borderColor: 'var(--line)', fontSize: '0.75rem' }}
                          >
                            {isEditingThis ? 'Cancel' : existing ? 'Update' : 'Add Record'}
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Form for this doc */}
                      {isEditingThis && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--line)' }}>
                          <div className="grid g3" style={{ marginBottom: '0.75rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                                Doc / Policy #
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. POL-99212"
                                value={docNumber}
                                onChange={(e) => setDocNumber(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.4rem',
                                  fontSize: '0.8rem',
                                  background: 'var(--card)',
                                  border: '1px solid var(--line)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                                Issue Date
                              </label>
                              <input
                                type="date"
                                value={docIssueDate}
                                onChange={(e) => setDocIssueDate(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.4rem',
                                  fontSize: '0.8rem',
                                  background: 'var(--card)',
                                  border: '1px solid var(--line)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                                Expiry Date *
                              </label>
                              <input
                                type="date"
                                required
                                value={docExpiryDate}
                                onChange={(e) => setDocExpiryDate(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '0.4rem',
                                  fontSize: '0.8rem',
                                  background: 'var(--card)',
                                  border: '1px solid var(--line)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                }}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleSaveDoc(dt.key)}
                            disabled={docLoading}
                            className="btn btn-sm btn-primary"
                          >
                            {docLoading ? 'Saving...' : 'Save Document'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Car Blocks / Maintenance Modal */}
      {selectedCarForBlocks && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blocks-modal-title"
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
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 id="blocks-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Maintenance & Locks: {selectedCarForBlocks.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--mute)', margin: '0.2rem 0 0 0' }}>
                  Lock vehicle from public booking during servicing, repairs, or private hold.
                </p>
              </div>
              <button
                onClick={() => setSelectedCarForBlocks(null)}
                className="btn btn-sm"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', fontSize: '1.2rem' }}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {blockError && (
              <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
                {blockError}
              </div>
            )}

            {/* Create Block Form */}
            <form
              onSubmit={handleCreateBlock}
              style={{
                padding: '1rem',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Create Availability Lock</h4>

              <div className="grid g2" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                    Lock Start (IST) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                    Lock End (IST) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div className="grid g2" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                    Reason *
                  </label>
                  <select
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value as 'maintenance' | 'reserved' | 'other')}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="maintenance">Maintenance / Service</option>
                    <option value="reserved">VIP / Offline Reserve</option>
                    <option value="other">Inspection / Repaint / Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--mute)', marginBottom: '0.25rem' }}>
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50,000 km periodic service at showroom"
                    value={blockNotes}
                    onChange={(e) => setBlockNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem',
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <button type="submit" disabled={blockLoading} className="btn btn-sm btn-primary">
                {blockLoading ? 'Applying Block...' : 'Lock Availability'}
              </button>
            </form>

            {/* Existing Blocks */}
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Existing Blocks & Holds</h4>
            {carBlocks.length === 0 ? (
              <div style={{ color: 'var(--mute)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No active maintenance or reservation blocks on this vehicle.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {carBlocks.map((b) => {
                  let formattedPeriod = b.period;
                  try {
                    const clean = b.period.replace(/[[\]()"]/g, '');
                    const [start, end] = clean.split(',');
                    formattedPeriod = `${formatDateTimeIST(start)} → ${formatDateTimeIST(end)}`;
                  } catch {
                    // fallback
                  }

                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                          {b.reason}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--mute)' }}>{formattedPeriod}</div>
                        {b.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginTop: '0.2rem' }}>{b.notes}</div>}
                      </div>

                      <button
                        onClick={() => handleDeleteBlock(b.id)}
                        disabled={blockLoading}
                        className="btn btn-sm"
                        style={{
                          background: 'transparent',
                          borderColor: 'var(--line)',
                          color: '#f87171',
                          fontSize: '0.75rem',
                        }}
                      >
                        Release Lock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
