import { Link } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot';
import PageHead from '../components/PageHead';
import { OFFERS } from '../data/content';
import { useMeta } from '../lib/useMeta';

export default function Offers() {
  useMeta('Offers | Glivva Car Rentals', 'Current offers and discounts on self drive car rental.');
  return (
    <>
      <PageHead title="Offers" lead="Save on your next self drive rental. Apply the code at checkout." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap">
        <div className="grid g3">{OFFERS.map(o => (
          <div className="card offer" key={o.code}><ImageSlot slotKey={`offer_${o.code.toLowerCase()}`} aspectRatio="16 / 8" /><h3>{o.title}</h3><p>{o.desc}</p><span className="code">{o.code}</span><p style={{ marginTop: '1rem' }}><Link className="gold-t" to="/cars">Book with this offer</Link></p></div>
        ))}</div>
      </div></section>
    </>
  );
}
