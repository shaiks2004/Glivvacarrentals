import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import CarCard from '../components/CarCard';
import PageHead from '../components/PageHead';
import { CITIES } from '../data/content';
import { fetchPublicCars } from '../data/fleet';
import type { Car } from '../data/fleet';
import { useMeta } from '../lib/useMeta';

export default function City() {
  const { slug } = useParams();
  const city = CITIES.find((c) => c.slug === slug);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPublicCars().then((data) => {
      if (!isMounted) return;
      setCars(data);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useMeta(
    city ? `Self Drive Cars in ${city.name} | Glivva` : 'City | Glivva',
    city?.blurb ?? 'Self drive car rental.',
    city
      ? {
          type: 'website',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'AutoRental',
            name: `Glivva Car Rentals - ${city.name}`,
            description: city.blurb,
            url: `https://glivvacarrentals.com/city/${city.slug}`,
            areaServed: {
              '@type': 'City',
              name: city.name,
            },
            serviceArea: city.areas.join(', '),
          },
        }
      : undefined
  );

  if (!city) return <Navigate to="/cars" replace />;
  const qs = `&pickup=${encodeURIComponent(city.name)}`;

  return (
    <>
      <PageHead title={`Self drive cars in ${city.name}`} lead={city.blurb} />
      <section style={{ paddingTop: '1rem', minHeight: '60vh' }}>
        <div className="wrap">
          <div className="chips">
            {city.areas.map((a) => (
              <span className="chip" key={a}>
                {a}
              </span>
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
              Loading {city.name} vehicle fleet...
            </div>
          ) : cars.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '4rem 1.5rem',
                color: 'var(--mute)',
              }}
            >
              <h3>No vehicles currently listed for {city.name}</h3>
              <p style={{ marginTop: '0.5rem' }}>
                Cars are added regularly. You can also view all vehicles across our hubs.
              </p>
              <Link className="btn gold sm" to="/cars" style={{ marginTop: '1rem' }}>
                View All Cars
              </Link>
            </div>
          ) : (
            <div className="grid g4">
              {cars.map((c) => (
                <CarCard key={c.id} c={c} qs={qs} />
              ))}
            </div>
          )}

          <p style={{ marginTop: '2rem' }}>
            <Link className="btn" to="/cars">
              Search by dates
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
