import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CarCard from '../components/CarCard';
import ImageSlot from '../components/ImageSlot';
import { CITIES, POLICIES, POSTS, REVIEWS, STEPS, WHY } from '../data/content';
import { useFleet } from '../data/fleet';
import { SITE } from '../data/site';
import { todayIST, tomorrowIST } from '../lib/format';
import { useMeta } from '../lib/useMeta';

function Head({ t, d }: { t: string; d: string }) {
  return (
    <div className="sec-head">
      <h2>{t}</h2>
      <p>{d}</p>
    </div>
  );
}

export default function Home() {
  useMeta(
    'Glivva Car Rentals | Self Drive Car Hire',
    'Hire a self-drive car with Glivva. Pick your city and dates, verify online and drive without a chauffeur.',
    {
      type: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'AutoRental',
        name: 'Glivva Car Rentals',
        description: 'Premium self-drive and car rental service across India.',
        url: 'https://glivvacarrentals.com',
        telephone: '+919296879793',
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'IN',
          addressRegion: 'Jharkhand',
          addressLocality: 'Ranchi',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 23.3441,
          longitude: 85.3096,
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: '06:00',
          closes: '23:00',
        },
      },
    }
  );
  const navigate = useNavigate();
  const [heroImg, setHeroImg] = useState(true);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const [q, setQ] = useState({
    city: CITIES[0].slug,
    from: todayIST(),
    ft: '10:00',
    to: tomorrowIST(),
    tt: '10:00',
  });
  const set =
    (k: keyof typeof q) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setQ((s) => ({ ...s, [k]: e.target.value }));

  // Dynamically load active fleet cars from production Supabase database
  const { cars: featuredCars, loading: carsLoading } = useFleet();

  const go = (e: FormEvent) => {
    e.preventDefault();
    navigate('/cars?' + new URLSearchParams(q).toString());
  };

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      connection?.saveData
    )
      return;
    const timer = window.setTimeout(() => setHeroVideoReady(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <section className="hero2">
        <div className="hero-reference-shell">
          <div className="hero-reference-visual">
            <ImageSlot slotKey="hero" className="hero-image-slot" />
            {heroImg && heroVideoReady && (
              <video
                className="hero-video"
                autoPlay
                muted
                loop
                playsInline
                onError={() => setHeroImg(false)}
              >
                <source src="/assets/hero-video.mp4" type="video/mp4" />
              </video>
            )}
          </div>

          <div className="hero-reference-copy">
            <div className="hero-reference-kicker">— Freedom to drive</div>
            <div className="hero-reference-title">Choose your car.</div>
            <div className="hero-reference-subtitle">Own your journey.</div>

            <p className="hero-reference-description">
              From weekend getaways with friends to family trips, find the right
              self-drive car and hit the road your way.
            </p>

            <div className="hero-reference-trust">
              <span>
                <i>✓</i> Verified fleet
              </span>
              <span>
                <i>◔</i> 24x7 support
              </span>
              <span>
                <i>◎</i> No driver
              </span>
            </div>
          </div>
        </div>

        <form className="hero-reference-search" onSubmit={go}>
          <div className="hero-reference-row">
            <div className="hero-reference-chip">Start here</div>
            <div className="hero-reference-label">Where are you driving from?</div>
            <div className="hero-reference-meta">Live cars • Instant confirmation</div>
          </div>

          <div className="hero-reference-fields">
            <label className="hero-field">
              <span>Pickup city</span>
              <select value={q.city} onChange={set('city')}>
                {CITIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="hero-field">
              <span>Pickup date</span>
              <input
                type="date"
                placeholder="mm/dd/yyyy"
                required
                min={todayIST()}
                value={q.from}
                onChange={set('from')}
              />
            </label>
            <label className="hero-field">
              <span>Pickup time</span>
              <input type="time" required value={q.ft} onChange={set('ft')} />
            </label>
            <label className="hero-field">
              <span>Return date</span>
              <input
                type="date"
                required
                min={q.from}
                value={q.to}
                onChange={set('to')}
              />
            </label>
            <label className="hero-field">
              <span>Return time</span>
              <input type="time" required value={q.tt} onChange={set('tt')} />
            </label>
            <button className="hero-submit" type="submit">
              Find my car <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>

      <section className="popular-cars">
        <div className="wrap">
          <div className="popular-cars-head">
            <div>
              <div className="popular-cars-kicker">Choose your mood</div>
              <h2>Popular cars.</h2>
              <p>Top rated by self drivers for comfort, value and easy road trips.</p>
            </div>
            <Link className="popular-cars-link" to="/cars">
              See all cars <span aria-hidden="true">→</span>
            </Link>
          </div>

          {carsLoading ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'var(--mute)',
              }}
            >
              Loading fleet inventory...
            </div>
          ) : featuredCars.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: 'var(--mute)',
              }}
            >
              <h3>Fleet inventory being updated</h3>
              <p style={{ marginTop: '0.5rem' }}>
                Our team is currently preparing vehicles. Click below to view all cars or contact support.
              </p>
              <Link className="btn gold sm" to="/cars" style={{ marginTop: '1rem' }}>
                Browse All Cars
              </Link>
            </div>
          ) : (
            <div className="grid g3">
              {featuredCars.slice(0, 4).map((c) => (
                <CarCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="band steps">
        <div className="wrap">
          <Head
            t="Book a self drive car in 4 simple steps"
            d="The whole process happens on your phone: no paperwork and no waiting in line."
          />
          <div className="grid g4">
            {STEPS.map((s, i) => (
              <div className="card" key={s.t}>
                <ImageSlot slotKey={`home_step_${i + 1}`} aspectRatio="16 / 8" />
                <div className="n">{i + 1}</div>
                <h3 style={{ marginTop: '.8rem' }}>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <Head
            t="Why choose Glivva for self drive rental?"
            d="Simple, honest and built around the traveller."
          />
          <div className="fx">
            {WHY.map((w, i) => (
              <div className="card" key={w.t}>
                <ImageSlot slotKey={`home_why_${i + 1}`} aspectRatio="16 / 8" />
                <div className="ico">{w.i}</div>
                <div>
                  <h3>{w.t}</h3>
                  <p>{w.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Head
            t="Pricing, insurance and policies"
            d="Everything stated upfront before you pay."
          />
          <div className="fx">
            {POLICIES.map((w) => (
              <div className="card" key={w.t}>
                <div className="ico">{w.i}</div>
                <div>
                  <h3>{w.t}</h3>
                  <p>{w.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: '1.6rem', textAlign: 'center' }}>
            <Link className="gold-t" to="/refund-cancellation">
              Read the refund and cancellation policy
            </Link>
          </p>
        </div>
      </section>

      {REVIEWS.length > 0 && (
        <section>
          <div className="wrap">
            <Head
              t="What our guests say"
              d="Honest feedback from people who drove with us."
            />
            <div className="grid g3">
              {REVIEWS.map((r, i) => (
                <div className="card" key={i}>
                  <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                  <p style={{ color: 'var(--text)' }}>&ldquo;{r.text}&rdquo;</p>
                  <h3 style={{ marginTop: '1rem', fontSize: '.95rem' }}>{r.name}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="band">
        <div className="wrap">
          <Head
            t="Cities we serve"
            d="Local pickup points and a team that knows the roads."
          />
          <div className="grid g4">
            {CITIES.map((c) => (
              <div className="card city" key={c.slug}>
                <ImageSlot slotKey={`city_${c.slug}`} aspectRatio="16 / 8" />
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
                <p className="areas">{c.areas.slice(0, 2).join(' · ')}</p>
                <p style={{ marginTop: '1rem' }}>
                  <Link className="gold-t" to={`/city/${c.slug}`}>
                    Explore {c.name} cars
                  </Link>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap" style={{ maxWidth: 860 }}>
          <Head t="Need an answer?" d="See the full rental FAQ before you book." />
          <p style={{ textAlign: 'center' }}>
            <Link className="btn" to="/faq">
              Browse FAQs
            </Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Head
            t="Tips and travel guides"
            d="Honest guides and road-trip ideas for self drive travellers."
          />
          <div className="grid g3">
            {POSTS.map((p) => (
              <Link className="card post" key={p.slug} to={`/blog/${p.slug}`}>
                <ImageSlot slotKey={`blog_${p.slug}`} aspectRatio="16 / 8" />
                <h3>{p.title}</h3>
                <p>{p.excerpt}</p>
              </Link>
            ))}
          </div>
          <p style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link className="btn" to="/blog">
              Read all guides
            </Link>
          </p>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="cta-band">
            <h2>Ready to drive?</h2>
            <p className="lead" style={{ marginInline: 'auto' }}>
              Book a self drive car in under two minutes. No driver. No hidden
              charges. Just you and the road.
            </p>
            <div className="cta">
              <a
                className="btn gold"
                href={'https://wa.me/' + SITE.wa}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book on WhatsApp
              </a>
              <Link className="btn" to="/cars">
                Browse cars
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
