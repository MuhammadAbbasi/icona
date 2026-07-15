import { SITE_CONFIG } from '@/config';

const HowItWorks = () => {
  const { how } = SITE_CONFIG;

  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">How it works</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">From spreadsheets to control in four steps</h2>
      </div>

      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {how.map((s) => (
          <div key={s.step} className="relative">
            <span className="text-4xl font-black text-primary/25">{s.step}</span>
            <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
