import { ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Hero = () => {
  const { hero, valueProps } = SITE_CONFIG;
  const [pre, post] = hero.title.split(hero.highlight);

  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-background to-background" />
      <div className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
          {hero.badge}
        </span>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
          {pre}
          <span className="text-primary">{hero.highlight}</span>
          {post}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{hero.subtitle}</p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={hero.primaryCta.href} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            {hero.primaryCta.label} <ArrowRight size={18} />
          </a>
          <a href={hero.secondaryCta.href} className="rounded-lg border border-border bg-card px-6 py-3 font-semibold transition-colors hover:bg-accent">
            {hero.secondaryCta.label}
          </a>
        </div>

        <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
          {valueProps.map((v) => (
            <span key={v.label} className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {v.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
