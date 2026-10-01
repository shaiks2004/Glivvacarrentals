import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot';
import PageHead from '../components/PageHead';
import { fetchCarBySlug } from '../data/fleet';
import type { Car } from '../data/fleet';
import { inr } from '../lib/format';
import { useMeta } from '../lib/useMeta';

export default function CarDetail() {
  const { slug } = useParams();
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetchCarBySlug(slug).then((res) => {
      if (!isMounted) return;
      if (!res) {
        setNotFound(true);
      } else {
        setCar(res);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useMeta(
    car ? `${car.name} | Glivva Car Rentals` : 'Car | Glivva Car Rentals',
    car
      ? `${car.name} self-drive rental from ${inr(car.price)} per day.`
      : 'Self-drive car rental.',
    car
      ? {
          type: 'product',
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: car.name,
            description: `${car.name} ${car.cat} self-drive car hire in India with ${car.seats} seats, ${car.fuel} fuel, and ${car.gear} transmission.`,
            offers: {
              '@type': 'Offer',
              price: car.price,
              priceCurrency: 'INR',
              availability: 'https://schema.org/InStock',
            },
          },
        }
      : undefined
  );

  if (notFound) return <Navigate to="/cars" replace />;

  if (loading || !car) {
    return (
      <div
        className="wrap"
        style={{
          padding: '6rem 1rem',
          textAlign: 'center',
          color: 'var(--mute)',
        }}
      >
        Loading vehicle details...
      </div>
    );
  }

  const primaryPhoto =
    car.photoUrls && car.photoUrls.length > 0
      ? car.photoUrls[0]
      : `/assets/cars/${car.id}.jpg`;

  return (
    <>
      <PageHead
        title={car.name}
        lead={`${car.cat} self-drive rental from ${inr(car.price)} per day.`}
      />
      <section className="car-detail-section">
        <div className="wrap split car-detail">
          <div>
            <ImageSlot
              slotKey={`car_${car.id}`}
              src={primaryPhoto}
              alt={car.name}
              className="car-detail-image"
              aspectRatio="16 / 10"
            />
            <div className="car-detail-gallery">
              <ImageSlot
                slotKey={`car_${car.id}_gallery_1`}
                src={car.photoUrls && car.photoUrls[1] ? car.photoUrls[1] : undefined}
                aspectRatio="1 / 1"
              />
              <ImageSlot
                slotKey={`car_${car.id}_gallery_2`}
                src={car.photoUrls && car.photoUrls[2] ? car.photoUrls[2] : undefined}
                aspectRatio="1 / 1"
              />
            </div>
          </div>
          <aside className="card car-detail-summary">
            <div className="popular-cars-kicker">Ready when you are</div>
            <h2>{car.name}</h2>
            <div className="car-detail-specs">
              <span>{car.cat}</span>
              <span>{car.seats} seats</span>
              <span>{car.fuel}</span>
              <span>{car.gear}</span>
              {car.cityName && <span>{car.cityName}</span>}
            </div>
            <div className="car-detail-price">
              {inr(car.price)} <small>/ day</small>
            </div>
            <p>
              Clear daily pricing. Availability is confirmed by our team after you
              submit your trip.
            </p>
            <Link className="btn gold" to={`/booking?car=${car.id}`}>
              Book this car
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
