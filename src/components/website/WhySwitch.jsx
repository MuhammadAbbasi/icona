import { X, Check } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

// Pain vs solution comparison; testimonials render right below in page.tsx.
const WhySwitch = () => {
  const { whySwitch } = SITE_CONFIG;

  return (
    <section id="why" className="mx-auto max-w-6xl px-6 pt-20 md:pt-28">
      <SectionHeader eyebrow="Why teams switch" title={whySwitch.heading} sub={whySwitch.subheading} />

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-border bg-muted/50 p-7">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">The old way</h3>
            <ul className="mt-5 space-y-4">
              {whySwitch.pains.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm md:text-base">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-500">
                    <X size={13} />
                  </span>
                  <span className="text-muted-foreground">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={130}>
          <div className="h-full rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/5 to-sky-500/5 p-7 shadow-lg shadow-primary/5 ring-1 ring-primary/20">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">With ICONA</h3>
            <ul className="mt-5 space-y-4">
              {whySwitch.gains.map((g) => (
                <li key={g} className="flex items-start gap-3 text-sm font-medium md:text-base">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <Check size={13} />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default WhySwitch;
