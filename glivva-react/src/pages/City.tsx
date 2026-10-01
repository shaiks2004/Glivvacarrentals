import { Link, Navigate, useParams } from 'react-router-dom';
import CarCard from '../components/CarCard';
import PageHead from '../components/PageHead';
import { CITIES } from '../data/content';
import { FLEET } from '../data/fleet';
import { useMeta } from '../lib/useMeta';

export default function City() {
  const { slug } = useParams();
  const city = CITIES.find(c => c.slug === slug);
  useMeta(city ? `Self Drive Cars in ${city.name} | Glivva` : 'City | Glivva', city?.blurb ?? 'Self drive car rental.');
  if (!city) return <Navigate to="/cars" replace />;
  const qs = `&pickup=${encodeURIComponent(city.name)}`;
  return (
    <>
      <PageHead title={`Self drive cars in ${city.name}`} lead={city.blurb} />
      <section style={{ paddingTop: '1rem' }}><div className="wrap">
        <div className="chips">{city.areas.map(a => <span className="chip" key={a}>{a}</span>)}</div>
        <div className="grid g4">{FLEET.map(c => <CarCard key={c.id} c={c} qs={qs} />)}</div>
        <p style={{ marginTop: '2rem' }}><Link className="btn" to="/cars">Search by dates</Link></p>
      </div></section>
    </>
  );
}
