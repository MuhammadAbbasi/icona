import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';
import { SNAPSHOTS } from './Snapshots';

// The journey: win the bid -> organize the board -> bill the client.
const HowItWorks = () => {
  const { how } = SITE_CONFIG;

  return (
    <section id="how" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <SectionHeader eyebrow="How it works" title="From winning the bid to billing the client" />

        <div className="relative mt-14 grid gap-10 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" aria-hidden="true" />
          {how.map((s, i) => {
            const Snapshot = SNAPSHOTS[s.snapshot] || SNAPSHOTS.kanban;
            return (
              <Reveal key={s.step} delay={i * 120}>
                <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-sky-500 font-display text-sm font-black text-white shadow-lg shadow-primary/25">
                  {s.step}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                <div className="card-hover mt-5 overflow-hidden rounded-xl border border-ink-border bg-ink shadow-lg">
                  <Snapshot />
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
