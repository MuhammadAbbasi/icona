import { ChevronDown } from 'lucide-react';
import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

// Native <details>/<summary>: accessible, works without JS.
const Faq = () => {
  const { faq } = SITE_CONFIG;

  return (
    <section id="faq" className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-3xl px-6 py-20 md:py-28">
        <SectionHeader eyebrow="FAQ" title="Questions, answered" />

        <div className="mt-12 space-y-3">
          {faq.map((item, i) => (
            <Reveal key={item.q} delay={i * 60}>
              <details className="group rounded-xl border border-border bg-card px-6 py-1 open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown size={18} className="shrink-0 text-primary transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-muted-foreground md:text-base">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
