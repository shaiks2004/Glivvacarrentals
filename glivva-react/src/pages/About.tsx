import { Link } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';

export default function About() {
  useMeta('About Us | Glivva Car Rentals', 'The story and values behind Glivva Car Rentals.');
  return (
    <>
      <PageHead title="About Glivva" lead="We believe a rental car should feel like the start of a good trip, not a chore." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap split">
        <div>
          <h2>More roads. Happier you.</h2>
          <p className="lead">Glivva Car Rentals is built around one idea: getting a car should be simple, honest and a little bit special. We keep a carefully maintained fleet, quote clearly and stay reachable throughout your trip.</p>
          <p className="lead">Whether you need a hatchback for a weekend, a chauffeur for a business day or a luxury car for a wedding, we match you with the right vehicle and look after the details.</p>
          <div className="cta"><Link className="btn gold" to="/booking">Book a car</Link><Link className="btn" to="/contact">Contact us</Link></div>
        </div>
        <ImageSlot slotKey="about" className="about-image-slot" aspectRatio="4 / 3" />
      </div></section>
      <section className="band"><div className="wrap">
        <h2>What we stand for</h2>
        <div className="grid g4" style={{ marginTop: '2.2rem' }}>
          {[['Honesty', 'Clear prices and policies.'], ['Care', 'Clean, inspected cars.'], ['Reliability', 'On-time pickup and support.'], ['Warmth', 'Friendly help throughout.']].map(([t, d]) => (
            <div className="card" key={t}><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div></section>
    </>
  );
}
