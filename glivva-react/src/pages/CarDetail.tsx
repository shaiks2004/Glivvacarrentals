import { Link, Navigate, useParams } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot';
import PageHead from '../components/PageHead';
import { FLEET } from '../data/fleet';
import { inr } from '../lib/format';
import { useMeta } from '../lib/useMeta';

export default function CarDetail() {
  const { slug } = useParams();
  const car = FLEET.find(item => item.id === slug);
  useMeta(car ? `${car.name} | Glivva Car Rentals` : 'Car | Glivva Car Rentals', car ? `${car.name} self-drive rental from ${inr(car.price)} per day.` : 'Self-drive car rental.');
  if (!car) return <Navigate to="/cars" replace />;

  return (
    <>
      <PageHead title={car.name} lead={`${car.cat} self-drive rental from ${inr(car.price)} per day.`} />
      <section className="car-detail-section"><div className="wrap split car-detail">
        <div>
          <ImageSlot slotKey={`car_${car.id}`} src={`/assets/cars/${car.id}.jpg`} alt={car.name} className="car-detail-image" aspectRatio="16 / 10" />
          <div className="car-detail-gallery">
            <ImageSlot slotKey={`car_${car.id}_gallery_1`} aspectRatio="1 / 1" />
            <ImageSlot slotKey={`car_${car.id}_gallery_2`} aspectRatio="1 / 1" />
          </div>
        </div>
        <aside className="card car-detail-summary">
          <div className="popular-cars-kicker">Ready when you are</div>
          <h2>{car.name}</h2>
          <div className="car-detail-specs"><span>{car.cat}</span><span>{car.seats} seats</span><span>{car.fuel}</span><span>{car.gear}</span></div>
          <div className="car-detail-price">{inr(car.price)} <small>/ day</small></div>
          <p>Clear daily pricing. Availability is confirmed by our team after you submit your trip.</p>
          <Link className="btn gold" to={`/booking?car=${car.id}`}>Book this car</Link>
        </aside>
      </div></section>
    </>
  );
}
