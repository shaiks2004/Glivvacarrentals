import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SITE } from '../data/site';

const LINKS = [['/', 'Home'], ['/cars', 'Our Fleet'], ['/offers', 'Offers'], ['/blog', 'Blog']] as const;

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const close = () => setOpen(false);
  return (
    <header className={'hd' + (scrolled ? ' s' : '')}>
      <div className="wrap hd-in">
        <Link className="brand" to="/" aria-label="Glivva Car Rentals home">
          <img src="/assets/logo-header.webp" alt="Glivva Car Rentals" width={98} height={50} />
        </Link>
        <nav className={open ? 'open' : ''} aria-label="Main">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'on' : '')} onClick={close}>{label}</NavLink>
          ))}
          <Link className="m-only" to="/login" onClick={close}>Log In</Link>
          <Link className="m-only" to="/cars" onClick={close}>Book Now</Link>
        </nav>
        <a className="tel" href={'tel:' + SITE.phone.replace(/\s/g, '')}>{SITE.phone}</a>
        <Link className="btn sm" to="/login">Log In</Link>
        <Link className="btn gold sm" to="/cars">Book Now</Link>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>&#9776;</button>
      </div>
    </header>
  );
}
