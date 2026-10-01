import { useMemo, useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useFleet } from '../data/fleet';
import { SITE } from '../data/site';
import { inr, todayIST } from '../lib/format';
import { ADDONS, calculateQuote, CHAUFFEUR_RATE } from '../lib/quote';
import { useMeta } from '../lib/useMeta';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface FormState {
  car: string;
  pickup: string;
  from: string;
  ft: string;
  to: string;
  tt: string;
  drv: 'self' | 'chauffeur';
  addons: string[];
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export default function Booking() {
  useMeta(
    'Book a Car | Glivva Car Rentals',
    'Request a booking and get an instant price estimate.'
  );
  const [params] = useSearchParams();
  const { user, profile } = useAuth();
  const { cars: availableCars, loading: carsLoading } = useFleet();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [f, setF] = useState<FormState>({
    car: params.get('car') ?? '',
    pickup: params.get('pickup') ?? 'Ranchi Airport / City Center',
    from: params.get('from') ?? todayIST(),
    ft: params.get('ft') ?? '10:00',
    to: params.get('to') ?? '',
    tt: params.get('tt') ?? '10:00',
    drv: 'self',
    addons: [],
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  // When cars are loaded, ensure default car is selected if not already set
  useEffect(() => {
    if (availableCars.length > 0 && !f.car) {
      const urlCar = params.get('car');
      const found = availableCars.find((c) => c.id === urlCar);
      setF((prev) => ({
        ...prev,
        car: found ? found.id : availableCars[0].id,
      }));
    }
  }, [availableCars, params, f.car]);

  // Pre-fill user profile if logged in
  useEffect(() => {
    if (user || profile) {
      setF((prev) => ({
        ...prev,
        name: prev.name || profile?.name || user?.user_metadata?.name || '',
        phone: prev.phone || profile?.phone || user?.phone || '',
        email: prev.email || user?.email || '',
      }));
    }
  }, [user, profile]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{
    ref: string;
    msg: string;
    name: string;
    phone: string;
    carName: string;
    pickup: string;
    from: string;
    to: string;
    total: number;
  } | null>(null);

  const set =
    (k: keyof FormState) =>
    (
      e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      setError('');
      setF((s) => ({ ...s, [k]: e.target.value }));
    };

  const selectedCar = useMemo(
    () => availableCars.find((c) => c.id === f.car),
    [availableCars, f.car]
  );

  const quote = useMemo(
    () =>
      calculateQuote({
        car: selectedCar,
        from: f.from,
        ft: f.ft,
        to: f.to,
        tt: f.tt,
        drv: f.drv,
        addons: f.addons,
      }),
    [selectedCar, f.from, f.ft, f.to, f.tt, f.drv, f.addons]
  );

  const toggleAddon = (id: string) => {
    setError('');
    setF((s) => ({
      ...s,
      addons: s.addons.includes(id)
        ? s.addons.filter((a) => a !== id)
        : [...s.addons, id],
    }));
  };

  const validateStep1 = () => {
    if (!f.car) {
      setError('Please choose a vehicle for your trip.');
      return false;
    }
    if (!f.pickup.trim()) {
      setError('Please provide a pickup location.');
      return false;
    }
    if (!f.from || !f.to) {
      setError('Please choose both pickup and return dates.');
      return false;
    }
    if (!quote || quote.days < 1) {
      setError('Return date and time must be after pickup date and time.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!f.name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (!f.phone.trim() || f.phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return false;
    }
    if (!f.email.trim() || !f.email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      if (!selectedCar) {
        throw new Error('Please select a valid car from the list.');
      }

      const carId = selectedCar.dbId;

      // Create period range in IST format
      const startIso = `${f.from}T${f.ft}:00+05:30`;
      const endIso = `${f.to}T${f.tt}:00+05:30`;
      const periodRange = `[${startIso}, ${endIso})`;

      // Format selected add-ons with rates
      const addonsPayload = f.addons.map((aId) => {
        const addonDef = ADDONS.find((a) => a.id === aId);
        return { id: aId, rate: addonDef?.rate || 0 };
      });

      const { data: bookingResult, error: bookingError } = await supabase.rpc(
        'create_booking',
        {
          p_car_id: carId,
          p_pickup_place: f.pickup.trim(),
          p_period: periodRange,
          p_driver_option: f.drv,
          p_addons: addonsPayload,
          p_notes: f.notes.trim() || null,
          p_guest_name: f.name.trim(),
          p_guest_phone: f.phone.trim(),
          p_guest_email: f.email.trim() || null,
        }
      );

      if (bookingError) {
        if (
          bookingError.code === '23P01' ||
          bookingError.message.includes('overlap') ||
          bookingError.message.includes('double_booking')
        ) {
          setError(
            'This vehicle is already booked or scheduled for maintenance during your selected dates. Please choose another car or adjust your dates.'
          );
        } else {
          setError(
            bookingError.message || 'Unable to submit reservation. Please try again.'
          );
        }
        setLoading(false);
        return;
      }

      const ref =
        bookingResult?.ref ||
        `GLV-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const carName = selectedCar.name;
      const msg = `Hi Glivva, I'd like to confirm booking ${ref} for ${carName} from ${f.from} ${f.ft} to ${f.to} ${f.tt}. Pickup: ${f.pickup}. Name: ${f.name}.`;

      setDone({
        ref,
        msg,
        name: f.name,
        phone: f.phone,
        carName,
        pickup: f.pickup,
        from: `${f.from} ${f.ft}`,
        to: `${f.to} ${f.tt}`,
        total: bookingResult?.total || quote?.total || 0,
      });

      window.scrollTo({ top: 80, behavior: 'smooth' });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'A network error occurred while creating your booking. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHead
        title="Book your car"
        lead="Share your trip details. We confirm availability and your final quote by phone or WhatsApp."
      />
      <section className="booking-section">
        <div className="wrap split booking-layout">
          <div>
            {/* SUCCESS CONFIRMATION SCREEN */}
            {done ? (
              <div
                className="ok"
                role="status"
                style={{ border: '1px solid var(--gold)', padding: '2rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    marginBottom: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      width: '2.4rem',
                      height: '2.4rem',
                      borderRadius: '50%',
                      background: 'rgba(226, 172, 47, 0.2)',
                      color: 'var(--gold)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}
                  >
                    ✓
                  </div>
                  <h3 style={{ fontSize: '1.3rem', margin: 0 }}>
                    Booking received. Our team will call you shortly to confirm.
                  </h3>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--r)',
                    padding: '1.2rem',
                    margin: '1.2rem 0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ color: 'var(--mute)', fontSize: '0.88rem' }}>
                      Booking Reference:
                    </span>
                    <strong
                      style={{ color: 'var(--gold)', letterSpacing: '1px' }}
                    >
                      {done.ref}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ color: 'var(--mute)', fontSize: '0.88rem' }}>
                      Vehicle:
                    </span>
                    <span>{done.carName}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ color: 'var(--mute)', fontSize: '0.88rem' }}>
                      Trip Schedule:
                    </span>
                    <span>
                      {done.from} to {done.to}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--line)',
                      paddingTop: '0.6rem',
                      marginTop: '0.6rem',
                    }}
                  >
                    <span style={{ color: 'var(--mute)', fontSize: '0.88rem' }}>
                      Estimated Total:
                    </span>
                    <strong style={{ color: 'var(--gold)' }}>
                      {inr(done.total)}
                    </strong>
                  </div>
                </div>

                {/* NOTIFICATION PREVIEW */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed var(--line)',
                    borderRadius: 'var(--r)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem',
                    color: 'var(--mute)',
                  }}
                >
                  <strong
                    style={{
                      color: 'var(--text)',
                      display: 'block',
                      marginBottom: '0.3rem',
                    }}
                  >
                    📲 Notification Queued (WhatsApp / SMS):
                  </strong>
                  "Hi {done.name}, we have received your booking {done.ref} for{' '}
                  {done.carName}, {done.from} to {done.to}. Please wait for a
                  call from our team to confirm. - Glivva Car Rentals"
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <a
                    className="btn gold"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://wa.me/${SITE.wa}?text=${encodeURIComponent(
                      done.msg
                    )}`}
                  >
                    Confirm via WhatsApp Now
                  </a>
                  <button
                    className="btn"
                    onClick={() => {
                      setDone(null);
                      setStep(1);
                    }}
                  >
                    Book Another Car
                  </button>
                </div>
              </div>
            ) : (
              /* MULTI-STEP WIZARD FORM */
              <form
                className="card booking-form"
                onSubmit={
                  step === 3
                    ? submit
                    : (e) => {
                        e.preventDefault();
                        handleNext();
                      }
                }
              >
                {/* WIZARD STEP INDICATOR */}
                <div
                  style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: 'var(--gold)',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor:
                        step >= 2 ? 'var(--gold)' : 'var(--line)',
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor:
                        step === 3 ? 'var(--gold)' : 'var(--line)',
                    }}
                  />
                </div>

                <div className="booking-form-intro">
                  <div className="booking-kicker">
                    Step {step} of 3:{' '}
                    {step === 1
                      ? 'Trip Details'
                      : step === 2
                      ? 'Driver Details'
                      : 'Review & Confirm'}
                  </div>
                  <h2>
                    {step === 1
                      ? 'Configure your trip'
                      : step === 2
                      ? 'Driver information'
                      : 'Review your booking'}
                  </h2>
                </div>

                {error && (
                  <div
                    className="err"
                    role="alert"
                    style={{
                      border: '1px solid #ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#fca5a5',
                      borderRadius: 'var(--r)',
                      padding: '0.9rem',
                      fontSize: '0.88rem',
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* STEP 1: TRIP DETAILS */}
                {step === 1 && (
                  <>
                    <label>
                      Car
                      <select
                        required
                        value={f.car}
                        onChange={set('car')}
                        disabled={carsLoading}
                      >
                        <option value="">
                          {carsLoading
                            ? 'Loading available cars...'
                            : availableCars.length === 0
                            ? 'No vehicles in database'
                            : 'Choose a car'}
                        </option>
                        {availableCars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.cat}), {inr(c.price)}/day
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Pickup location
                      <input
                        required
                        value={f.pickup}
                        onChange={set('pickup')}
                        placeholder="City, airport or address"
                      />
                    </label>

                    <div className="grid2">
                      <label>
                        Pickup date
                        <input
                          type="date"
                          required
                          min={todayIST()}
                          value={f.from}
                          onChange={set('from')}
                        />
                      </label>
                      <label>
                        Pickup time
                        <input
                          type="time"
                          required
                          value={f.ft}
                          onChange={set('ft')}
                        />
                      </label>
                    </div>

                    <div className="grid2">
                      <label>
                        Return date
                        <input
                          type="date"
                          required
                          min={f.from || todayIST()}
                          value={f.to}
                          onChange={set('to')}
                        />
                      </label>
                      <label>
                        Return time
                        <input
                          type="time"
                          required
                          value={f.tt}
                          onChange={set('tt')}
                        />
                      </label>
                    </div>

                    <fieldset
                      style={{ border: 0, display: 'grid', gap: '.6rem' }}
                    >
                      <legend
                        style={{
                          font: '600 .78rem Montserrat',
                          color: 'var(--mute)',
                          marginBottom: '.4rem',
                        }}
                      >
                        Driving option
                      </legend>
                      <label className="chk">
                        <input
                          type="radio"
                          name="drv"
                          checked={f.drv === 'self'}
                          onChange={() => setF((s) => ({ ...s, drv: 'self' }))}
                        />
                        Self-drive
                      </label>
                      <label className="chk">
                        <input
                          type="radio"
                          name="drv"
                          checked={f.drv === 'chauffeur'}
                          onChange={() =>
                            setF((s) => ({ ...s, drv: 'chauffeur' }))
                          }
                        />
                        With chauffeur (+{inr(CHAUFFEUR_RATE)} / day)
                      </label>
                    </fieldset>

                    <fieldset
                      style={{ border: 0, display: 'grid', gap: '.6rem' }}
                    >
                      <legend
                        style={{
                          font: '600 .78rem Montserrat',
                          color: 'var(--mute)',
                          marginBottom: '.4rem',
                        }}
                      >
                        Add-ons (Optional)
                      </legend>
                      {ADDONS.map((a) => (
                        <label className="chk" key={a.id}>
                          <input
                            type="checkbox"
                            checked={f.addons.includes(a.id)}
                            onChange={() => toggleAddon(a.id)}
                          />
                          {a.label} ({inr(a.rate)} / day)
                        </label>
                      ))}
                    </fieldset>

                    <button
                      className="btn gold"
                      type="button"
                      onClick={handleNext}
                      style={{ marginTop: '0.8rem' }}
                      disabled={carsLoading || availableCars.length === 0}
                    >
                      Continue to Driver Details →
                    </button>
                  </>
                )}

                {/* STEP 2: DRIVER DETAILS */}
                {step === 2 && (
                  <>
                    <div className="grid2">
                      <label>
                        Full name
                        <input
                          required
                          autoComplete="name"
                          value={f.name}
                          onChange={set('name')}
                          placeholder="e.g. Rahul Sharma"
                        />
                      </label>
                      <label>
                        Mobile number
                        <input
                          type="tel"
                          required
                          autoComplete="tel"
                          value={f.phone}
                          onChange={set('phone')}
                          placeholder="+91 98765 43210"
                        />
                      </label>
                    </div>

                    <label>
                      Email address
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={f.email}
                        onChange={set('email')}
                        placeholder="name@example.com"
                      />
                    </label>

                    <label>
                      Special requests or flight number (optional)
                      <textarea
                        value={f.notes}
                        onChange={set('notes')}
                        placeholder="e.g. Flight AI-415 arrival, airport pickup at gate 2"
                      />
                    </label>

                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '0.8rem',
                      }}
                    >
                      <button className="btn" type="button" onClick={handleBack}>
                        ← Back
                      </button>
                      <button
                        className="btn gold"
                        type="button"
                        onClick={handleNext}
                        style={{ flex: 1 }}
                      >
                        Review Booking →
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 3: REVIEW & CONFIRM */}
                {step === 3 && (
                  <>
                    <div
                      style={{
                        backgroundColor: 'var(--bg)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--r)',
                        padding: '1.2rem',
                        display: 'grid',
                        gap: '0.7rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: 'var(--mute)' }}>Vehicle:</span>
                        <strong>{selectedCar?.name}</strong>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: 'var(--mute)' }}>
                          Pickup Location:
                        </span>
                        <span>{f.pickup}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: 'var(--mute)' }}>Dates:</span>
                        <span>
                          {f.from} {f.ft} → {f.to} {f.tt}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: 'var(--mute)' }}>
                          Driver Option:
                        </span>
                        <span style={{ textTransform: 'capitalize' }}>
                          {f.drv === 'chauffeur'
                            ? 'With Chauffeur'
                            : 'Self-Drive'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: 'var(--mute)' }}>
                          Driver Name:
                        </span>
                        <span>{f.name}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ color: 'var(--mute)' }}>
                          Contact Phone:
                        </span>
                        <span>{f.phone}</span>
                      </div>
                    </div>

                    <p style={{ color: 'var(--mute)', fontSize: '0.85rem' }}>
                      By requesting this booking, you agree to Glivva Car
                      Rentals'{' '}
                      <Link to="/terms" style={{ color: 'var(--gold)' }}>
                        Terms
                      </Link>{' '}
                      and{' '}
                      <Link
                        to="/refund-cancellation"
                        style={{ color: 'var(--gold)' }}
                      >
                        Cancellation Policy
                      </Link>
                      . Zero upfront payment required today.
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '0.8rem',
                      }}
                    >
                      <button
                        className="btn"
                        type="button"
                        onClick={handleBack}
                        disabled={loading}
                      >
                        ← Edit Details
                      </button>
                      <button
                        className="btn gold"
                        type="submit"
                        disabled={loading}
                        style={{ flex: 1 }}
                      >
                        {loading
                          ? 'Submitting request...'
                          : 'Confirm Booking Request'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>

          {/* ASIDE LIVE QUOTE SUMMARY */}
          <aside className="card sum booking-summary">
            <div className="booking-summary-head">
              <div>
                <div className="booking-kicker">Your booking</div>
                <h3>Price estimate</h3>
              </div>
              <span className="booking-status">Live estimate</span>
            </div>

            {quote ? (
              <>
                <div className="row" style={{ marginTop: '1rem' }}>
                  <span>Vehicle ({quote.car.name})</span>
                  <span>
                    {inr(quote.car.price)} × {quote.days}d
                  </span>
                </div>
                {quote.driver > 0 && (
                  <div className="row">
                    <span>Chauffeur service</span>
                    <span>+{inr(quote.driver)}</span>
                  </div>
                )}
                {quote.addons > 0 && (
                  <div className="row">
                    <span>Add-ons</span>
                    <span>+{inr(quote.addons)}</span>
                  </div>
                )}
                <div className="row">
                  <span>Subtotal</span>
                  <span>
                    {inr(quote.base + quote.driver + quote.addons)}
                  </span>
                </div>
                <div className="row">
                  <span>GST (18%)</span>
                  <span>+{inr(quote.gst)}</span>
                </div>
                <div className="row tot">
                  <span>Total Estimated</span>
                  <span>{inr(quote.total)}</span>
                </div>
              </>
            ) : (
              <p className="booking-empty" style={{ marginTop: '1rem' }}>
                Select a car and return date to calculate your estimated trip cost.
              </p>
            )}

            <div className="booking-trust">
              <div>
                <b>✓</b> Zero hidden charges
              </div>
              <div>
                <b>✓</b> Free cancellation up to 6h before trip
              </div>
              <div>
                <b>✓</b> 24x7 Roadside assistance included
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
