import { Link } from 'react-router-dom';
import { CITIES } from '../data/content';
import { SITE } from '../data/site';

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="fg">
          <div>
            <Link className="brand" to="/"><img src="/assets/logo-header.webp" alt="Glivva Car Rentals" width={126} height={64} loading="lazy" /></Link>
            <p style={{ color: 'var(--mute)', maxWidth: '32ch' }}>More Roads. Happier You. Self-drive car hire with clear pricing and support on every trip.</p>
          </div>
          <div><h4>Cities</h4><ul>{CITIES.map(c => <li key={c.slug}><Link to={`/city/${c.slug}`}>Self drive cars {c.name}</Link></li>)}</ul></div>
          <div><h4>Company</h4><ul><li><Link to="/cars">Browse cars</Link></li><li><Link to="/offers">Offers</Link></li><li><Link to="/blog">Blog</Link></li><li><Link to="/about">About us</Link></li><li><Link to="/faq">FAQ</Link></li><li><Link to="/contact">Contact</Link></li></ul></div>
          <div><h4>Get in touch</h4><ul><li><a href={'tel:' + SITE.phone.replace(/\s/g, '')}>{SITE.phone}</a></li><li><a href={'https://wa.me/' + SITE.wa}>WhatsApp us</a></li><li><a href={'mailto:' + SITE.email}>{SITE.email}</a></li><li>{SITE.addr}</li></ul></div>
        </div>
        <div className="legalbar">
          <span>&copy; {new Date().getFullYear()} Glivva Car Rentals. All rights reserved.</span>
          <span><Link to="/terms">Terms</Link> &nbsp;/&nbsp; <Link to="/privacy">Privacy</Link> &nbsp;/&nbsp; <Link to="/refund-cancellation">Refund &amp; cancellation</Link></span>
        </div>
      </div>
    </footer>
  );
}
