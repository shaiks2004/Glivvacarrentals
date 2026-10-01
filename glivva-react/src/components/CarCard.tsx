import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Car } from '../data/fleet';
import { inr } from '../lib/format';

function CarCard({ c, qs = '' }: { c: Car; qs?: string }) {
  const [photoError, setPhotoError] = useState(false);

  // Use uploaded photo URL from Supabase Storage or fallback to local asset path
  const photoSrc =
    !photoError && c.photoUrls && c.photoUrls.length > 0
      ? c.photoUrls[0]
      : !photoError
      ? `/assets/cars/${c.id}.jpg`
      : null;

  return (
    <article className="card car">
      <div className="art">
        <img
          className="sw"
          src="/assets/swoosh.webp"
          alt=""
          width={900}
          height={179}
          loading="lazy"
          decoding="async"
        />
        {photoSrc ? (
          <img
            className="ph"
            src={photoSrc}
            alt={c.name}
            loading="lazy"
            decoding="async"
            onError={() => setPhotoError(true)}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3.5rem',
              opacity: 0.8,
            }}
          >
            🚗
          </div>
        )}
        <span className="tag">{c.cat}</span>
      </div>
      <div className="b">
        <h3>
          <Link to={`/car/${c.id}`}>{c.name}</Link>
        </h3>
        <div className="spec">
          <span>{c.seats} seats</span>
          <span>{c.fuel}</span>
          <span>{c.gear}</span>
        </div>
        <div className="ft">
          <div className="price">
            <small>from </small>
            {inr(c.price)}
            <small>/day</small>
          </div>
          <Link className="btn gold sm" to={`/booking?car=${c.id}${qs}`}>
            Book now
          </Link>
        </div>
      </div>
    </article>
  );
}

export default memo(CarCard);
