import { Smartphone, Check, MapPin, Camera } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';

const PhoneMock = () => (
  <div className="relative" aria-hidden="true">
    <div className="absolute -inset-6 -z-10 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/10 blur-2xl" />
    <div className="relative flex h-[26rem] w-52 flex-col rounded-[2.2rem] border border-ink-border bg-ink p-3 shadow-2xl">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-ink-border" />
      <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-3 py-2.5 text-primary-foreground">
        <Smartphone size={16} />
        <span className="text-xs font-semibold">ICONA Field</span>
      </div>

      <div className="mt-3 space-y-2">
        {[
          { label: 'Attendance', sub: '18 marked today', active: true },
          { label: 'Site visit', sub: 'Add notes & photos', active: false },
          { label: 'Project BOQ', sub: 'Tower A · live', active: false },
          { label: 'Labour log', sub: '3 crews on site', active: false },
        ].map((t) => (
          <div
            key={t.label}
            className={`rounded-xl border px-3 py-2.5 ${t.active ? 'border-primary/50 bg-primary/10' : 'border-ink-border bg-ink-card'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink-foreground">{t.label}</span>
              <span className={`h-2 w-2 rounded-full ${t.active ? 'bg-primary' : 'bg-ink-border'}`} />
            </div>
            <span className="text-[10px] text-ink-muted">{t.sub}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between rounded-xl border border-ink-border bg-ink-card px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] text-ink-muted">
          <MapPin size={12} className="text-primary" /> On site
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-ink-muted">
          <Camera size={12} className="text-primary" /> 4 photos
        </span>
        <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Synced</span>
      </div>
    </div>
  </div>
);

const MobileApp = () => {
  const { mobile } = SITE_CONFIG;

  return (
    <section id="mobile" className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Mobile</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{mobile.title}</h2>
        <p className="mt-4 text-lg text-muted-foreground">{mobile.subtitle}</p>
        <ul className="mt-8 space-y-3.5">
          {mobile.points.map((p) => (
            <li key={p} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <Check size={13} />
              </span>
              <span className="text-sm md:text-base">{p}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={150} className="flex justify-center">
        <PhoneMock />
      </Reveal>
    </section>
  );
};

export default MobileApp;
