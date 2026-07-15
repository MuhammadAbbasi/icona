import { Quote } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Testimonials = () => {
  const { testimonials } = SITE_CONFIG;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Why teams switch</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Built around real site workflows</h2>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <figure key={i} className="flex flex-col rounded-xl border border-border bg-card p-6">
            <Quote size={22} className="text-primary/40" />
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed">{t.quote}</blockquote>
            <figcaption className="mt-6 border-t border-border pt-4">
              <div className="text-sm font-semibold">{t.author}</div>
              <div className="text-xs text-muted-foreground">{t.role}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
