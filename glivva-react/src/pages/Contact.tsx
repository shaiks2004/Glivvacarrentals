import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import PageHead from '../components/PageHead';
import { SITE } from '../data/site';
import { useMeta } from '../lib/useMeta';
import { supabase } from '../lib/supabase';

const TOPICS = [
  'Booking enquiry',
  'Chauffeur or airport transfer',
  'Corporate or monthly',
  'Weddings and events',
  'Something else',
];

const EMPTY = { name: '', phone: '', email: '', topic: TOPICS[0], msg: '', website_hp: '' };

export default function Contact() {
  useMeta('Contact | Glivva Car Rentals', 'Get in touch with Glivva Car Rentals.');
  const [f, setF] = useState(EMPTY);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof EMPTY) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setError('');
    setF((s) => ({ ...s, [k]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Honeypot spam check
    if (f.website_hp) {
      setSent(f.name);
      setF(EMPTY);
      return;
    }

    if (!f.name.trim() || !f.email.trim() || !f.msg.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('contact_messages').insert({
        name: f.name.trim(),
        phone: f.phone.trim() || null,
        email: f.email.trim(),
        topic: f.topic,
        message: f.msg.trim(),
      });

      if (insertError) {
        setError('Unable to send message right now. Please try calling or messaging us on WhatsApp.');
        setLoading(false);
        return;
      }

      setSent(f.name.trim());
      setF(EMPTY);
    } catch {
      setError('Unable to send message right now. Please reach out via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Contact us"
        lead="Questions, quotes or special requests. We usually reply within a few hours."
      />
      <section style={{ paddingTop: '1rem' }}>
        <div className="wrap split">
          <div>
            {sent && (
              <div className="ok" role="status">
                <h3>Message sent</h3>
                <p style={{ color: 'var(--mute)', marginTop: '.4rem' }}>
                  Thank you, {sent}. We have received your inquiry and will get back to you shortly.
                </p>
              </div>
            )}

            {error && (
              <div
                className="err"
                role="alert"
                style={{
                  border: '1px solid #ef4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#fca5a5',
                  borderRadius: 'var(--r)',
                  padding: '1rem',
                  marginBottom: '1.2rem',
                  fontSize: '0.9rem',
                }}
              >
                {error}
              </div>
            )}

            <form className="card" style={{ display: 'grid', gap: '1.1rem' }} onSubmit={submit}>
              <h3>Send a message</h3>

              {/* Honeypot field invisible to human users */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label>
                  Leave this field empty
                  <input
                    type="text"
                    name="website_hp"
                    tabIndex={-1}
                    autoComplete="off"
                    value={f.website_hp}
                    onChange={set('website_hp')}
                  />
                </label>
              </div>

              <div className="grid2">
                <label>
                  Name
                  <input
                    required
                    autoComplete="name"
                    value={f.name}
                    onChange={set('name')}
                    placeholder="Your full name"
                    disabled={loading}
                  />
                </label>
                <label>
                  Phone (optional)
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={f.phone}
                    onChange={set('phone')}
                    placeholder="+91 98765 43210"
                    disabled={loading}
                  />
                </label>
              </div>

              <label>
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={f.email}
                  onChange={set('email')}
                  placeholder="name@example.com"
                  disabled={loading}
                />
              </label>

              <label>
                Topic
                <select value={f.topic} onChange={set('topic')} disabled={loading}>
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Message
                <textarea
                  required
                  value={f.msg}
                  onChange={set('msg')}
                  placeholder="Tell us about your trip, questions, or requirements"
                  disabled={loading}
                />
              </label>

              <button className="btn gold" type="submit" disabled={loading}>
                {loading ? 'Sending message...' : 'Send message'}
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="card">
              <h3>Call or WhatsApp</h3>
              <p>
                <a className="gold-t" href={'tel:' + SITE.phone.replace(/\s/g, '')}>
                  {SITE.phone}
                </a>
              </p>
            </div>
            <div className="card">
              <h3>Email</h3>
              <p>
                <a className="gold-t" href={'mailto:' + SITE.email}>
                  {SITE.email}
                </a>
              </p>
            </div>
            <div className="card">
              <h3>Visit us</h3>
              <p>
                {SITE.addr}
                <br />
                {SITE.hours}
              </p>
            </div>
            <div className="card">
              <h3>Roadside support</h3>
              <p>Available 24x7 for active rentals across Jharkhand and Odisha.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
