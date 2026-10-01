import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { useMeta } from '../lib/useMeta';

export default function NotFound() {
  useMeta('Page not found | Glivva Car Rentals', 'This page could not be found.');
  return (
    <>
      <PageHead title="Page not found" lead="The page you are looking for has moved or does not exist." />
      <section style={{ paddingTop: 0 }}><div className="wrap cta"><Link className="btn gold" to="/">Back to home</Link><Link className="btn" to="/cars">Browse the fleet</Link></div></section>
    </>
  );
}
