import { FileSpreadsheet, UserCheck, BookOpenCheck, ShieldCheck, Clock } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

const ICONS = { FileSpreadsheet, UserCheck, BookOpenCheck, ShieldCheck };

const Guides = () => {
  const { guides } = SITE_CONFIG;

  return (
    <section id="guides" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader eyebrow="Guides" title={guides.heading} sub={guides.subheading} />

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {guides.items.map((g, i) => {
          const Icon = ICONS[g.icon] || BookOpenCheck;
          return (
            <Reveal key={g.title} delay={i * 90} className="h-full">
              <div className="card-hover flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-sky-500/15 text-primary">
                    <Icon size={20} />
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} /> {g.minutes} min
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{g.title}</h3>
                <ol className="mt-3 flex-1 space-y-2">
                  {g.steps.map((s, j) => (
                    <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {j + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

export default Guides;
