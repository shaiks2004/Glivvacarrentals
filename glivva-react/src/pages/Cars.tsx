import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import CarCard from '../components/CarCard';
import PageHead from '../components/PageHead';
import { CITIES } from '../data/content';
import { CATEGORIES, FLEET } from '../data/fleet';
import type { Category } from '../data/fleet';
import { todayIST, tomorrowIST } from '../lib/format';
import { useMeta } from '../lib/useMeta';

export default function Cars() {
  useMeta('Our Fleet | Glivva Car Rentals', 'Browse self drive hatchbacks, sedans, SUVs, MPVs and luxury cars by city and date.');
  const [sp] = useSearchParams();
  const [city, setCity] = useState(sp.get('city') ?? CITIES[0].slug);
  const [from, setFrom] = useState(sp.get('from') ?? todayIST());
  const [to, setTo] = useState(sp.get('to') ?? tomorrowIST());
  const [cat, setCat] = useState<'All' | Category>('All');
  const [sort, setSort] = useState<'low' | 'high'>('low');
  const list = useMemo(() => FLEET.filter(c => cat === 'All' || c.cat === cat).sort((a, b) => (sort === 'low' ? a.price - b.price : b.price - a.price)), [cat, sort]);
  const qs = `&pickup=${encodeURIComponent(CITIES.find(c => c.slug === city)?.name ?? '')}&from=${from}&to=${to}&ft=${sp.get('ft') ?? '10:00'}&tt=${sp.get('tt') ?? '10:00'}`;
  return (
    <>
      <PageHead title="Our fleet" lead="Choose your city and dates, then pick the car that fits your trip. Rates are per day." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap">
        <div className="find" style={{ marginTop: 0, gridTemplateColumns: 'repeat(4,1fr)' }}>
          <label>City<select value={city} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCity(e.target.value)}>{CITIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          <label>Pickup date<input type="date" min={todayIST()} value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>Return date<input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} /></label>
          <label>Sort by<select value={sort} onChange={e => setSort(e.target.value as 'low' | 'high')}><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label>
        </div>
        <div className="chips">{CATEGORIES.map(c => <button key={c} className={'chip' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="grid g4">{list.map(c => <CarCard key={c.id} c={c} qs={qs} />)}</div>
      </div></section>
    </>
  );
}
