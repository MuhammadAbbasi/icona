import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

const HowItWorks = () => {
  const { how } = SITE_CONFIG;

  return (
    <section id="how" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <SectionHeader eyebrow="How it works" title="From spreadsheets to control in four steps" />

        <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* connector line on desktop */}
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block" aria-hidden="true" />
          {how.map((s, i) => (
            <Reveal key={s.step} delay={i * 110}>
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 font-display text-sm font-black text-primary-foreground shadow-lg shadow-primary/25">
                {s.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
