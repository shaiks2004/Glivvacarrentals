import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { SERVICES } from '../data/site';
import { useMeta } from '../lib/useMeta';

export default function Services() {
  useMeta('Services | Glivva Car Rentals', 'Self-drive, chauffeur, airport transfers, outstation, events and corporate rentals.');
  return (
    <>
      <PageHead title="Services" lead="Whatever the journey, there is a Glivva option for it." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap">
        <div className="grid g3">
          {SERVICES.map(s => (
            <div className="card svc" key={s.title}>
              <div className="ico">{s.icon}</div><h3>{s.title}</h3><p>{s.desc}</p>
              <ul>{s.points.map(p => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="cta-band" style={{ marginTop: '3rem' }}>
          <h2>Need something custom?</h2>
          <p className="lead" style={{ marginInline: 'auto' }}>Tell us about your trip and we will shape a plan and a quote.</p>
          <div className="cta"><Link className="btn gold" to="/contact">Request a quote</Link></div>
        </div>
      </div></section>
    </>
  );
}
