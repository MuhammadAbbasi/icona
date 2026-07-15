import { Layers, FolderKanban, Wallet, HardHat, ClipboardList, Landmark, Users } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const ICONS = { Layers, FolderKanban, Wallet, HardHat, ClipboardList, Landmark, Users };

const Modules = () => {
  const { modules } = SITE_CONFIG;

  return (
    <section id="modules" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Modules</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Everything a construction firm runs on</h2>
        <p className="mt-4 text-muted-foreground">
          Seven connected modules across ERP and CRM, so estimating, the site, and the money all share the same data.
        </p>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => {
          const Icon = ICONS[m.icon] || Layers;
          return (
            <div key={m.title} className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={22} />
                </span>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {m.group}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Modules;
