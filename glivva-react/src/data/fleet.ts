import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type Category = 'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'Luxury';

export const CATEGORIES: ('All' | Category)[] = [
  'All',
  'Hatchback',
  'Sedan',
  'SUV',
  'MPV',
  'Luxury',
];

export interface DbCar {
  id: number;
  slug: string;
  name: string;
  category: Category;
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

export interface Car {
  id: string; // slug identifier for URL and routing
  dbId: number; // primary key integer in PostgreSQL
  name: string;
  cat: Category;
  seats: number;
  fuel: string;
  gear: string;
  price: number;
  photoUrls: string[];
  active: boolean;
  regNumber?: string | null;
  cityId?: number | null;
  cityName?: string;
  status?: 'available' | 'booked' | 'maintenance' | 'archived';
}

export function mapDbCarToCar(row: DbCar): Car {
  const cityData = row.city as unknown as
    | { id: number; name: string; state: string }
    | { id: number; name: string; state: string }[]
    | null;
  const resolvedCity = Array.isArray(cityData) ? cityData[0] : cityData;

  return {
    id: row.slug,
    dbId: row.id,
    name: row.name,
    cat: row.category,
    seats: row.seats,
    fuel: row.fuel,
    gear: row.transmission,
    price: Number(row.price_per_day),
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls : [],
    active: row.active,
    regNumber: row.reg_number,
    cityId: row.city_id,
    cityName: resolvedCity?.name,
    status: row.active ? 'available' : 'archived',
  };
}

/**
 * Fetch active public cars from the production Supabase database
 */
export async function fetchPublicCars(options?: {
  cityId?: number;
  category?: string;
}): Promise<Car[]> {
  try {
    let query = supabase
      .from('cars')
      .select('*, city:cities(id, name, state)')
      .eq('active', true)
      .order('price_per_day', { ascending: true });

    if (options?.cityId) {
      query = query.eq('city_id', options.cityId);
    }
    if (options?.category && options.category !== 'All') {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to fetch public cars from Supabase:', error);
      return [];
    }

    return (data || []).map((row: DbCar) => mapDbCarToCar(row));
  } catch (err) {
    console.error('Network error fetching cars:', err);
    return [];
  }
}

/**
 * Fetch a single car by slug identifier from production Supabase database
 */
export async function fetchCarBySlug(slug: string): Promise<Car | null> {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*, city:cities(id, name, state)')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return null;
    }

    return mapDbCarToCar(data as DbCar);
  } catch (err) {
    console.error(`Error fetching car with slug ${slug}:`, err);
    return null;
  }
}

/**
 * React hook for live fleet loading with loading, error, and refresh controls
 */
export function useFleet(options?: { cityId?: number; category?: string }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('cars')
        .select('*, city:cities(id, name, state)')
        .eq('active', true)
        .order('price_per_day', { ascending: true });

      if (options?.cityId) {
        query = query.eq('city_id', options.cityId);
      }
      if (options?.category && options.category !== 'All') {
        query = query.eq('category', options.category);
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;

      setCars((data || []).map((row: DbCar) => mapDbCarToCar(row)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch vehicles from database.';
      setError(msg);
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, [options?.cityId, options?.category]);

  useEffect(() => {
    load();
  }, [load]);

  return { cars, loading, error, refresh: load };
}
