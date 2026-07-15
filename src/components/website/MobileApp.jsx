import { Smartphone, Check } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const MobileApp = () => {
  const { mobile } = SITE_CONFIG;

  return (
    <section id="mobile" className="border-y border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Mobile</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{mobile.title}</h2>
          <p className="mt-4 text-muted-foreground">{mobile.subtitle}</p>
          <ul className="mt-8 space-y-3">
            {mobile.points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check size={13} />
                </span>
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center">
          <div className="relative flex h-80 w-44 flex-col rounded-[2rem] border-4 border-foreground/10 bg-card p-3 shadow-xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground">
              <Smartphone size={16} />
              <span className="text-xs font-semibold">ICONA Field</span>
            </div>
            <div className="mt-3 space-y-2">
              {['Attendance', 'Site visit', 'Project BOQ', 'Labour log'].map((t, i) => (
                <div key={t} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-[11px] font-medium">{t}</span>
                  <span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileApp;
