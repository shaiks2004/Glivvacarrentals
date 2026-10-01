import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import PageHead from '../components/PageHead';
import { SITE } from '../data/site';
import { useMeta } from '../lib/useMeta';

const TOPICS = ['Booking enquiry', 'Chauffeur or airport transfer', 'Corporate or monthly', 'Weddings and events', 'Something else'];
const EMPTY = { name: '', phone: '', email: '', topic: TOPICS[0], msg: '' };

export default function Contact() {
  useMeta('Contact | Glivva Car Rentals', 'Get in touch with Glivva Car Rentals.');
  const [f, setF] = useState(EMPTY);
  const [sent, setSent] = useState('');
  const set = (k: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(s => ({ ...s, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: connect to your backend, Formspree or EmailJS. For now messages are saved in this browser only.
    try {
      const list = JSON.parse(localStorage.getItem('glivva_messages') ?? '[]') as unknown[];
      list.push(f);
      localStorage.setItem('glivva_messages', JSON.stringify(list));
    } catch { /* storage unavailable */ }
    setSent(f.name);
    setF(EMPTY);
  };
  return (
    <>
      <PageHead title="Contact us" lead="Questions, quotes or special requests. We usually reply within a few hours." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap split">
        <div>
          {sent && <div className="ok" role="status"><h3>Message sent</h3><p style={{ color: 'var(--mute)', marginTop: '.4rem' }}>Thank you, {sent}. We will get back to you shortly.</p></div>}
          <form className="card" style={{ display: 'grid', gap: '1.1rem' }} onSubmit={submit}>
            <h3>Send a message</h3>
            <div className="grid2"><label>Name<input required value={f.name} onChange={set('name')} /></label><label>Phone<input type="tel" value={f.phone} onChange={set('phone')} /></label></div>
            <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
            <label>Topic<select value={f.topic} onChange={set('topic')}>{TOPICS.map(t => <option key={t}>{t}</option>)}</select></label>
            <label>Message<textarea required value={f.msg} onChange={set('msg')} /></label>
            <button className="btn gold" type="submit">Send message</button>
          </form>
        </div>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="card"><h3>Call or WhatsApp</h3><p><a className="gold-t" href={'tel:' + SITE.phone.replace(/\s/g, '')}>{SITE.phone}</a></p></div>
          <div className="card"><h3>Email</h3><p><a className="gold-t" href={'mailto:' + SITE.email}>{SITE.email}</a></p></div>
          <div className="card"><h3>Visit us</h3><p>{SITE.addr}<br />{SITE.hours}</p></div>
          <div className="card"><h3>Roadside support</h3><p>Available 24x7 for active rentals.</p></div>
        </div>
      </div></section>
    </>
  );
}
