import { Link } from 'react-router-dom';
import ImageSlot from '../components/ImageSlot';
import PageHead from '../components/PageHead';
import { POSTS } from '../data/content';
import { useMeta } from '../lib/useMeta';

export default function Blog() {
  useMeta('Blog | Glivva Car Rentals', 'Guides, tips and road-trip ideas for self drive travellers.');
  return (
    <>
      <PageHead title="Tips and travel guides" lead="Honest guides, checklists and road-trip ideas for self drive travellers." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap">
        <div className="grid g3">{POSTS.map(p => (
          <Link className="card post" key={p.slug} to={`/blog/${p.slug}`}><ImageSlot slotKey={`blog_${p.slug}`} aspectRatio="16 / 8" /><span className="meta">{new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><h3 style={{ marginTop: '.4rem' }}>{p.title}</h3><p>{p.excerpt}</p></Link>
        ))}</div>
      </div></section>
    </>
  );
}
