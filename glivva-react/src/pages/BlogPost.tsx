import { Link, Navigate, useParams } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { POSTS } from '../data/content';
import { useMeta } from '../lib/useMeta';

export default function BlogPost() {
  const { slug } = useParams();
  const post = POSTS.find(p => p.slug === slug);
  useMeta(post ? `${post.title} | Glivva` : 'Blog | Glivva', post?.excerpt ?? '');
  if (!post) return <Navigate to="/blog" replace />;
  return (
    <>
      <PageHead title={post.title} lead={post.excerpt} />
      <section style={{ paddingTop: 0 }}><div className="wrap prose">
        {post.body.map((p, i) => <p key={i}>{p}</p>)}
        <p style={{ marginTop: '2rem' }}><Link className="btn gold" to="/cars">Browse cars</Link> &nbsp; <Link className="btn" to="/blog">More guides</Link></p>
      </div></section>
    </>
  );
}
