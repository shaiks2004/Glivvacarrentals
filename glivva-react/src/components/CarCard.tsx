import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Car } from '../data/fleet';
import { inr } from '../lib/format';

function CarCard({ c, qs = '' }: { c: Car; qs?: string }) {
  const [hasPhoto, setHasPhoto] = useState(true);
  return (
    <article className="card car">
      <div className="art">
        <img className="sw" src="/assets/swoosh.webp" alt="" width={900} height={179} loading="lazy" decoding="async" />
        {hasPhoto && <img className="ph" src={`/assets/cars/${c.id}.jpg`} alt={c.name} loading="lazy" decoding="async" onError={() => setHasPhoto(false)} />}
        <span className="tag">{c.cat}</span>
      </div>
      <div className="b">
        <h3><Link to={`/car/${c.id}`}>{c.name}</Link></h3>
        <div className="spec"><span>{c.seats} seats</span><span>{c.fuel}</span><span>{c.gear}</span></div>
        <div className="ft">
          <div className="price"><small>from </small>{inr(c.price)}<small>/day</small></div>
          <Link className="btn gold sm" to={`/booking?car=${c.id}${qs}`}>Book now</Link>
        </div>
      </div>
    </article>
  );
}
export default memo(CarCard);
