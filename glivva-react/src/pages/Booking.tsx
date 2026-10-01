import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { FLEET } from '../data/fleet';
import { SITE } from '../data/site';
import { inr, todayIST } from '../lib/format';
import { ADDONS, calculateQuote, CHAUFFEUR_RATE } from '../lib/quote';
import { useMeta } from '../lib/useMeta';

interface FormState {
  car: string; pickup: string; from: string; ft: string; to: string; tt: string;
  drv: 'self' | 'chauffeur'; addons: string[]; name: string; phone: string; email: string; notes: string;
}

export default function Booking() {
  useMeta('Book a Car | Glivva Car Rentals', 'Request a booking and get an instant price estimate.');
  const [params] = useSearchParams();
  const [f, setF] = useState<FormState>({
    car: params.get('car') ?? '', pickup: params.get('pickup') ?? '', from: params.get('from') ?? '', ft: params.get('ft') ?? '10:00',
    to: params.get('to') ?? '', tt: params.get('tt') ?? '10:00', drv: 'self', addons: [], name: '', phone: '', email: '', notes: '',
  });
  const [done, setDone] = useState<{ ref: string; msg: string; name: string; phone: string } | null>(null);
  const set = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(s => ({ ...s, [k]: e.target.value }));

  const quote = useMemo(() => calculateQuote({
    car: FLEET.find(c => c.id === f.car),
    from: f.from,
    ft: f.ft,
    to: f.to,
    tt: f.tt,
    drv: f.drv,
    addons: f.addons,
  }), [f]);

  const toggleAddon = (id: string) => setF(s => ({ ...s, addons: s.addons.includes(id) ? s.addons.filter(a => a !== id) : [...s.addons, id] }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!quote) { alert('Please choose a car and a return time after your pickup time.'); return; }
    const ref = 'GLV-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    // TODO: send this booking to your backend / email service. For now it is saved in this browser only.
    try {
      const list = JSON.parse(localStorage.getItem('glivva_bookings') ?? '[]') as unknown[];
      list.push({ ref, ...f, total: quote.total });
      localStorage.setItem('glivva_bookings', JSON.stringify(list));
    } catch { /* storage unavailable */ }
    const msg = `Hi Glivva, I'd like to book ${quote.car.name} from ${f.from} ${f.ft} to ${f.to} ${f.tt}. Pickup: ${f.pickup}. Name: ${f.name}. Ref ${ref}.`;
    setDone({ ref, msg, name: f.name, phone: f.phone });
    setF(s => ({ ...s, car: '', from: '', to: '', addons: [], notes: '' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <PageHead title="Book your car" lead="Share your trip details. We confirm availability and your final quote by phone or WhatsApp." />
      <section className="booking-section"><div className="wrap split booking-layout">
        <div>
          {done && (
            <div className="ok" role="status">
              <h3>Request received. Your reference is {done.ref}</h3>
              <p style={{ color: 'var(--mute)', marginTop: '.5rem' }}>Thank you, {done.name}. We will contact you on {done.phone} to confirm. For a faster reply, message us on WhatsApp.</p>
              <p style={{ marginTop: '1rem' }}><a className="btn gold sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${SITE.wa}?text=${encodeURIComponent(done.msg)}`}>Confirm on WhatsApp</a></p>
            </div>
          )}
          <form className="card booking-form" onSubmit={submit}>
            <div className="booking-form-intro">
              <div className="booking-kicker">Start your journey</div>
              <h2>Booking information</h2>
              <p>Tell us where and when you want to drive. We will confirm availability and the final amount with you.</p>
            </div>
            <h3>Trip details</h3>
            <label>Car<select required value={f.car} onChange={set('car')}><option value="">Choose a car</option>{FLEET.map(c => <option key={c.id} value={c.id}>{c.name} ({c.cat}), {inr(c.price)}/day</option>)}</select></label>
            <label>Pickup location<input required value={f.pickup} onChange={set('pickup')} placeholder="City, airport or address" /></label>
            <div className="grid2"><label>Pickup date<input type="date" required min={todayIST()} value={f.from} onChange={set('from')} /></label><label>Pickup time<input type="time" required value={f.ft} onChange={set('ft')} /></label></div>
            <div className="grid2"><label>Return date<input type="date" required min={f.from || todayIST()} value={f.to} onChange={set('to')} /></label><label>Return time<input type="time" required value={f.tt} onChange={set('tt')} /></label></div>
            <fieldset style={{ border: 0, display: 'grid', gap: '.6rem' }}>
              <legend style={{ font: '600 .78rem Montserrat', color: 'var(--mute)', marginBottom: '.4rem' }}>Driving option</legend>
              <label className="chk"><input type="radio" name="drv" checked={f.drv === 'self'} onChange={() => setF(s => ({ ...s, drv: 'self' }))} /> Self-drive</label>
              <label className="chk"><input type="radio" name="drv" checked={f.drv === 'chauffeur'} onChange={() => setF(s => ({ ...s, drv: 'chauffeur' }))} /> With chauffeur (+{inr(CHAUFFEUR_RATE)} / day)</label>
            </fieldset>
            <fieldset style={{ border: 0, display: 'grid', gap: '.6rem' }}>
              <legend style={{ font: '600 .78rem Montserrat', color: 'var(--mute)', marginBottom: '.4rem' }}>Add-ons</legend>
              {ADDONS.map(a => <label className="chk" key={a.id}><input type="checkbox" checked={f.addons.includes(a.id)} onChange={() => toggleAddon(a.id)} /> {a.label} ({inr(a.rate)} / day)</label>)}
            </fieldset>
            <h3 style={{ marginTop: '.6rem' }}>Your details</h3>
            <div className="grid2"><label>Full name<input required autoComplete="name" value={f.name} onChange={set('name')} /></label><label>Phone<input type="tel" required autoComplete="tel" value={f.phone} onChange={set('phone')} /></label></div>
            <label>Email<input type="email" required autoComplete="email" value={f.email} onChange={set('email')} /></label>
            <label>Notes (optional)<textarea value={f.notes} onChange={set('notes')} placeholder="Delivery address, flight number, special requests" /></label>
            <button className="btn gold" type="submit">Request booking</button>
            <p style={{ color: 'var(--mute)', fontSize: '.82rem' }}>Nothing is charged now. Our team confirms availability and the final amount with you.</p>
          </form>
        </div>
        <aside className="card sum booking-summary">
          <div className="booking-summary-head">
            <div>
              <div className="booking-kicker">Your booking</div>
              <h3>Price estimate</h3>
            </div>
            <span className="booking-status">Live estimate</span>
          </div>
          <div style={{ marginTop: '1rem' }}>
            {!quote ? <p className="booking-empty">Choose a car and your dates to see an estimate.</p> : (
              <>
                <div className="row"><span>{quote.car.name} x {quote.days} day{quote.days > 1 ? 's' : ''}</span><span>{inr(quote.base)}</span></div>
                {quote.driver > 0 && <div className="row"><span>Chauffeur</span><span>{inr(quote.driver)}</span></div>}
                {quote.addons > 0 && <div className="row"><span>Add-ons</span><span>{inr(quote.addons)}</span></div>}
                <div className="row"><span>GST (estimated 18%)</span><span>{inr(quote.gst)}</span></div>
                <div className="row tot"><span>Estimated total</span><span>{inr(quote.total)}</span></div>
                <p className="booking-note">Estimate only. Fuel, tolls and security deposit are extra.</p>
              </>
            )}
          </div>
          <div className="booking-trust">
            <span><b>✓</b> No payment now</span>
            <span><b>◷</b> Fast confirmation</span>
            <span><b>↗</b> WhatsApp support</span>
          </div>
        </aside>
      </div></section>
    </>
  );
}
