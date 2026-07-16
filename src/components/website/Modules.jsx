import { Layers, FolderKanban, Wallet, HardHat, ClipboardList, Landmark, Users, ArrowUpRight } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

const ICONS = { Layers, FolderKanban, Wallet, HardHat, ClipboardList, Landmark, Users };

const Modules = () => {
  const { modules } = SITE_CONFIG;

  return (
    <section id="modules" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader
        eyebrow="Modules"
        title="Everything a construction firm runs on"
        sub="Seven connected modules across ERP and CRM, so estimating, the site, staff, and the money all share the same data."
      />

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m, i) => {
          const Icon = ICONS[m.icon] || Layers;
          return (
            <Reveal key={m.title} delay={(i % 3) * 90}>
              <div className="card-hover group h-full rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-amber-500/15 text-primary transition-transform duration-300 group-hover:scale-110">
                    <Icon size={22} />
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {m.group}
                  </span>
                </div>
                <h3 className="mt-5 flex items-center gap-1.5 text-lg font-semibold">
                  {m.title}
                  <ArrowUpRight size={16} className="text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

export default Modules;
