'use client';
import { useState } from 'react';
import { Check, Gauge } from 'lucide-react';
import { SITE_CONFIG, resolveCta, annualPrice } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

const Pricing = () => {
  const { pricing, billing } = SITE_CONFIG;
  const [cycle, setCycle] = useState('annual'); // 'monthly' | 'annual'
  const annual = cycle === 'annual';

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <SectionHeader
        eyebrow="Pricing"
        title="Simple plans that grow with your firm"
        sub="Start on the plan that fits today. Upgrade only when your projects and team outgrow it."
      />

      <Reveal delay={100}>
        <div className="mt-10 flex items-center justify-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm mx-auto w-fit" role="group" aria-label="Billing cycle">
          {[
            { key: 'monthly', label: 'Monthly' },
            { key: 'annual', label: 'Annual' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setCycle(opt.key)}
              aria-pressed={cycle === opt.key}
              className={`btn-press rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                cycle === opt.key ? 'bg-gradient-to-r from-primary to-sky-500 text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
              {opt.key === 'annual' && (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${cycle === 'annual' ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                  {billing.annualMonthsFree} months free
                </span>
              )}
            </button>
          ))}
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {pricing.map((tier, i) => {
          const perMonth = annual ? Math.round(annualPrice(tier.monthly) / 12) : tier.monthly;
          return (
            <Reveal key={tier.name} delay={i * 110} className="h-full">
              <div
                className={`card-hover flex h-full flex-col rounded-2xl border bg-card p-8 ${
                  tier.featured ? 'border-primary shadow-xl shadow-primary/10 ring-1 ring-primary' : 'border-border'
                }`}
              >
                {tier.featured && (
                  <span className="mb-4 w-fit rounded-full bg-gradient-to-r from-primary to-sky-500 px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-lg font-bold">{tier.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>

                <p className="mt-6">
                  <span className="font-display text-4xl font-extrabold">${perMonth}</span>
                  <span className="text-base font-medium text-muted-foreground">/mo</span>
                </p>
                <p className="mt-1 h-5 text-xs text-muted-foreground">
                  {annual ? `Billed $${annualPrice(tier.monthly)}/year - ${billing.annualMonthsFree} months free` : 'Billed monthly, cancel anytime'}
                </p>

                <div className="mt-6 rounded-xl border border-border bg-muted/60 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Gauge size={14} className="text-primary" /> Plan limits
                  </p>
                  <ul className="space-y-1.5">
                    {tier.limits.map((l) => (
                      <li key={l} className="text-sm font-medium">{l}</li>
                    ))}
                  </ul>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={resolveCta(tier.ctaHref)}
                  className={`btn-press mt-8 rounded-xl px-5 py-3 text-center text-sm font-semibold transition-all ${
                    tier.featured
                      ? 'bg-gradient-to-r from-primary to-sky-500 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35'
                      : 'border border-border bg-background hover:bg-accent'
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={100}>
        <div className="mx-auto mt-10 max-w-3xl space-y-2 text-center text-sm text-muted-foreground">
          <p>{billing.limitNote}</p>
          <p>{billing.note}</p>
        </div>
      </Reveal>
    </section>
  );
};

export default Pricing;
