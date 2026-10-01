import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard';
import PageHead from '../components/PageHead';
import { CITIES } from '../data/content';
import { CATEGORIES, useFleet } from '../data/fleet';
import type { Category } from '../data/fleet';
import { todayIST, tomorrowIST } from '../lib/format';
import { useMeta } from '../lib/useMeta';

export default function Cars() {
  useMeta(
    'Our Fleet | Glivva Car Rentals',
    'Browse self drive hatchbacks, sedans, SUVs, MPVs and luxury cars by city and date.'
  );
  const [sp] = useSearchParams();
  const [city, setCity] = useState(sp.get('city') ?? CITIES[0].slug);
  const [from, setFrom] = useState(sp.get('from') ?? todayIST());
  const [to, setTo] = useState(sp.get('to') ?? tomorrowIST());
  const [cat, setCat] = useState<'All' | Category>('All');
  const [sort, setSort] = useState<'low' | 'high'>('low');

  const { cars, loading, error } = useFleet();

  const list = useMemo(() => {
    return cars
      .filter((c) => cat === 'All' || c.cat === cat)
      .sort((a, b) => (sort === 'low' ? a.price - b.price : b.price - a.price));
  }, [cars, cat, sort]);

  const qs = `&pickup=${encodeURIComponent(
    CITIES.find((c) => c.slug === city)?.name ?? ''
  )}&from=${from}&to=${to}&ft=${sp.get('ft') ?? '10:00'}&tt=${
    sp.get('tt') ?? '10:00'
  }`;

  return (
    <>
      <PageHead
        title="Our fleet"
        lead="Choose your city and dates, then pick the car that fits your trip. Rates are per day."
      />
      <section style={{ paddingTop: '1rem', minHeight: '60vh' }}>
        <div className="wrap">
          <div
            className="find"
            style={{ marginTop: 0, gridTemplateColumns: 'repeat(4,1fr)' }}
          >
            <label>
              City
              <select
                value={city}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setCity(e.target.value)
                }
              >
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pickup date
              <input
                type="date"
                min={todayIST()}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Return date
              <input
                type="date"
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label>
              Sort by
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as 'low' | 'high')
                }
              >
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
              </select>
            </label>
          </div>

          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={'chip' + (c === cat ? ' on' : '')}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '4rem 1.5rem',
                color: 'var(--mute)',
              }}
            >
              Loading available vehicles from database...
            </div>
          ) : error ? (
            <div
              className="err"
              role="alert"
              style={{
                textAlign: 'center',
                padding: '2rem',
                margin: '2rem 0',
              }}
            >
              {error}
            </div>
          ) : list.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '4rem 1.5rem',
                color: 'var(--mute)',
              }}
            >
              <h3>No vehicles currently available</h3>
              <p style={{ marginTop: '0.5rem' }}>
                Please adjust your category filter or check back shortly as our fleet is updated in real time.
              </p>
            </div>
          ) : (
            <div className="grid g4">
              {list.map((c) => (
                <CarCard key={c.id} c={c} qs={qs} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
