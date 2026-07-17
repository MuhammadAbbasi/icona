import { Quote } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

const initials = (name) => name.split(' ').map((w) => w[0]).slice(0, 2).join('');

const Testimonials = () => {
  const { testimonials } = SITE_CONFIG;

  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <SectionHeader eyebrow="Testimonials" title="Built around real site workflows" />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 110} className="h-full">
              <figure className="card-hover flex h-full flex-col rounded-2xl border border-border bg-card p-7">
                <Quote size={24} className="text-primary/50" />
                <blockquote className="mt-4 flex-1 leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-sky-500/20 text-sm font-bold text-primary">
                    {initials(t.author)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{t.author}</span>
                    <span className="block text-xs text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
