import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import { FAQS } from '../data/site';
import { useMeta } from '../lib/useMeta';

export default function Faq() {
  useMeta('FAQ | Glivva Car Rentals', 'Answers to common car rental questions.', {
    type: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.a,
        },
      })),
    },
  });
  return (
    <>
      <PageHead title="Frequently asked questions" lead="Quick answers to the things people ask most." />
      <section style={{ paddingTop: '1rem' }}><div className="wrap" style={{ maxWidth: 820 }}>
        {FAQS.map(x => (<details key={x.q}><summary>{x.q}</summary><p>{x.a}</p></details>))}
        <p style={{ marginTop: '2rem', color: 'var(--mute)' }}>Still unsure? <Link className="gold-t" to="/contact">Ask our team</Link>.</p>
      </div></section>
    </>
  );
}
