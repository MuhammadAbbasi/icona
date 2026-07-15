import { Check } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Pricing = () => {
  const { pricing, hero } = SITE_CONFIG;

  return (
    <section id="pricing" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Plans that grow with your firm</h2>
          <p className="mt-4 text-muted-foreground">Simple tiers for small and medium contractors. Talk to us for a quote fit to your projects.</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricing.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-2xl border bg-card p-8 ${
                tier.featured ? 'border-primary shadow-lg ring-1 ring-primary' : 'border-border'
              }`}
            >
              {tier.featured && (
                <span className="mb-4 w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
              <p className="mt-6 text-3xl font-extrabold">{tier.price}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={hero.primaryCta.href}
                className={`mt-8 rounded-lg px-5 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 ${
                  tier.featured ? 'bg-primary text-primary-foreground' : 'border border-border bg-background'
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
