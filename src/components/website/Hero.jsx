import { ArrowRight, Building2, Wallet, HardHat, TrendingUp } from 'lucide-react';
import { SITE_CONFIG, resolveCta } from '@/config';
import Reveal from './Reveal';

// Illustrative dashboard numbers for the hero mock (not real customer data).
const MOCK_KPIS = [
  { icon: Building2, label: 'Active projects', value: '12' },
  { icon: Wallet, label: 'Cash on hand', value: 'Rs 48.2M' },
  { icon: HardHat, label: 'Workers on site', value: '214' },
  { icon: TrendingUp, label: 'Budget vs actual', value: '96%' },
];

const MOCK_ROWS = [
  { name: 'Gulberg Heights - Tower A', progress: 72, amount: 'Rs 186.4M' },
  { name: 'DHA Villas - Phase 2', progress: 45, amount: 'Rs 92.1M' },
  { name: 'Canal Road Plaza', progress: 88, amount: 'Rs 61.8M' },
];

const DashboardMock = () => (
  <div className="relative mx-auto mt-16 max-w-4xl" aria-hidden="true">
    <div className="absolute -inset-x-8 -top-8 bottom-0 -z-10 rounded-[2.5rem] bg-gradient-to-b from-primary/15 via-amber-500/5 to-transparent blur-2xl" />
    <div className="overflow-hidden rounded-2xl border border-ink-border bg-ink shadow-2xl">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-ink-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-4 hidden rounded-md bg-ink-card px-3 py-1 text-[11px] text-ink-muted sm:block">
          app.icona.app/dashboard
        </span>
      </div>

      <div className="grid sm:grid-cols-[150px_1fr]">
        {/* sidebar */}
        <div className="hidden border-r border-ink-border p-3 sm:block">
          {['Dashboard', 'Projects', 'BOQ', 'Ledger', 'Labour', 'Clients'].map((item, i) => (
            <div
              key={item}
              className={`mb-1 rounded-md px-3 py-1.5 text-[11px] font-medium ${
                i === 0 ? 'bg-primary/20 text-primary' : 'text-ink-muted'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* main panel */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {MOCK_KPIS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-lg border border-ink-border bg-ink-card p-3">
                <Icon size={14} className="text-primary" />
                <div className="mt-2 font-display text-sm font-bold text-ink-foreground">{value}</div>
                <div className="text-[10px] text-ink-muted">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-ink-border bg-ink-card p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              <span>Project</span>
              <span>Progress · BOQ value</span>
            </div>
            {MOCK_ROWS.map((row) => (
              <div key={row.name} className="flex items-center gap-3 border-t border-ink-border py-2.5">
                <span className="flex-1 truncate text-[11px] font-medium text-ink-foreground">{row.name}</span>
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-ink-border md:block">
                  <span className="block h-full rounded-full bg-gradient-to-r from-primary to-amber-500" style={{ width: `${row.progress}%` }} />
                </span>
                <span className="w-10 text-right text-[11px] text-ink-muted">{row.progress}%</span>
                <span className="hidden w-20 text-right text-[11px] font-medium text-ink-foreground sm:block">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Hero = () => {
  const { hero, stats } = SITE_CONFIG;
  const [pre, post] = hero.title.split(hero.highlight);

  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      {/* backdrop: soft grid + orange glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 0%, black 40%, transparent 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-primary/10 to-transparent" />

      <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
        <Reveal>
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {hero.badge}
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-[clamp(2.4rem,6vw,4.2rem)] font-extrabold leading-[1.08] tracking-tight">
            {pre}
            <span className="text-gradient">{hero.highlight}</span>
            {post}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">{hero.subtitle}</p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={resolveCta(hero.primaryCta.href)}
              className="btn-press inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-7 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/40"
            >
              {hero.primaryCta.label} <ArrowRight size={18} />
            </a>
            <a
              href={hero.secondaryCta.href}
              className="btn-press rounded-xl border border-border bg-card px-7 py-3.5 font-semibold transition-colors hover:bg-accent"
            >
              {hero.secondaryCta.label}
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{hero.footnote}</p>
        </Reveal>

        <Reveal delay={200}>
          <DashboardMock />
        </Reveal>

        <Reveal delay={100}>
          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-extrabold text-gradient">{s.value}</dd>
                <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
};

export default Hero;
