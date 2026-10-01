import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'glivva_splash_v1';

export default function Splash({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  const skipRef = useRef<HTMLButtonElement>(null);
  const end = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setOpen(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* storage unavailable */
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(onDone, reduced ? 0 : 900);
  }, [onDone]);

  useEffect(() => {
    document.body.classList.add('lock');
    skipRef.current?.focus();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setTimeout(end, reduced ? 0 : 250);
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', key);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', key);
      document.body.classList.remove('lock');
    };
  }, [end]);

  return (
    <div id="splash" className={open ? 'open' : ''} role="dialog" aria-modal="true" aria-label="Loading Glivva">
      <div className="grain" />
      <div className="light" />
      <div className="bloom" />
      <img className="slogo" src="/assets/logo.webp" alt="Glivva Car Rentals" width={1000} height={511} />
      <div className="rail">
        <i />
      </div>
      <button ref={skipRef} id="skip" type="button" onClick={end}>
        SKIP
      </button>
    </div>
  );
}
