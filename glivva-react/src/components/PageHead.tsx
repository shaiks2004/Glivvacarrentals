export default function PageHead({ title, lead }: { title: string; lead: string }) {
  return (
    <section className="page-hd">
      <div className="wrap"><h1>{title}</h1><p className="lead">{lead}</p></div>
    </section>
  );
}
