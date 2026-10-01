import PageHead from './PageHead';

export interface LegalSection { t: string; b: string }

export default function Legal({ title, lead, sections }: { title: string; lead: string; sections: LegalSection[] }) {
  const updated = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return (
    <>
      <PageHead title={title} lead={lead} />
      <section style={{ paddingTop: 0 }}>
        <div className="wrap legal">
          <p style={{ fontSize: '.85rem' }}>Last updated: {updated}. This is a starter template. Please have it reviewed by a legal professional before publishing.</p>
          {sections.map(s => (<div key={s.t}><h3>{s.t}</h3><p>{s.b}</p></div>))}
        </div>
      </section>
    </>
  );
}
