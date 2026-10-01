import { useMemo, useState } from 'react';
import CarCard from '../components/CarCard';
import PageHead from '../components/PageHead';
import { CATEGORIES, FLEET } from '../data/fleet';
import type { Category } from '../data/fleet';
import { useMeta } from '../lib/useMeta';

export default function Fleet() {
  useMeta('Our Fleet | Glivva Car Rentals', 'Browse hatchbacks, sedans, SUVs, MPVs and luxury cars.');
  const [cat, setCat] = useState<'All' | Category>('All');
  const list = useMemo(() => FLEET.filter(c => cat === 'All' || c.cat === cat), [cat]);
  return (
    <>
      <PageHead title="Our fleet" lead="Well-kept cars for every budget and every trip. Rates are per day and exclude taxes, fuel and extras." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap">
        <div className="chips" role="tablist">
          {CATEGORIES.map(c => <button key={c} className={'chip' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="grid g4">{list.map(c => <CarCard key={c.id} c={c} />)}</div>
      </div></section>
    </>
  );
}
