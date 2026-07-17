import { Workflow, HardHat, Wallet, Users, Check } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';
import { SNAPSHOTS } from './Snapshots';

const ICONS = { Workflow, HardHat, Wallet, Users };

const Modules = () => {
  const { modules } = SITE_CONFIG;

  return (
    <section id="modules" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader
        eyebrow="Modules"
        title="Everything a construction firm runs on"
        sub="Four connected modules, one shared database - estimating, the site, the money, and the client all read the same numbers."
      />

      <div className="mt-16 space-y-20">
        {modules.map((m, i) => {
          const Icon = ICONS[m.icon] || Workflow;
          const Snapshot = SNAPSHOTS[m.snapshot] || SNAPSHOTS.kanban;
          const flipped = i % 2 === 1;
          return (
            <Reveal key={m.title}>
              <div className={`grid items-center gap-10 md:grid-cols-2 ${flipped ? 'md:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-sky-500/15 text-primary">
                    <Icon size={24} />
                  </span>
                  <h3 className="mt-5 text-2xl font-bold tracking-tight md:text-3xl">{m.title}</h3>
                  <p className="mt-3 text-muted-foreground md:text-lg">{m.description}</p>
                  <ul className="mt-6 space-y-2.5">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm md:text-base">
                        <Check size={17} className="mt-0.5 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card-hover overflow-hidden rounded-2xl border border-ink-border bg-ink shadow-xl">
                  <div className="flex items-center gap-1.5 border-b border-ink-border px-4 py-2.5">
                    <span className="h-2 w-2 rounded-full bg-red-400/70" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                    <span className="ml-3 text-[10px] text-ink-muted">app.icona.app</span>
                  </div>
                  <Snapshot />
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

export default Modules;
