import { SITE_CONFIG } from '@/config';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';

// Illustrative UI mocks with placeholder numbers (no real screenshots yet).

const BoqMock = () => (
  <div className="space-y-1.5 text-[11px]" aria-hidden="true">
    <div className="flex justify-between rounded-md bg-primary/15 px-3 py-2 font-semibold text-primary">
      <span>Grey Structure</span>
      <span>Rs 84.6M</span>
    </div>
    {[
      ['Excavation & foundation', 'Rs 12.4M'],
      ['RCC frame - floors 1-6', 'Rs 48.9M'],
      ['Block masonry & plaster', 'Rs 23.3M'],
    ].map(([name, amount]) => (
      <div key={name} className="flex justify-between rounded-md border border-ink-border px-3 py-2 text-ink-muted">
        <span className="pl-3">{name}</span>
        <span className="font-medium text-ink-foreground">{amount}</span>
      </div>
    ))}
    <div className="flex justify-between px-3 pt-1.5 font-semibold text-ink-foreground">
      <span>Rolls up automatically</span>
      <span className="text-gradient">Rs 84.6M ✓</span>
    </div>
  </div>
);

const BudgetMock = () => (
  <div className="space-y-3 text-[11px]" aria-hidden="true">
    {[
      ['Materials', 82, 'text-emerald-400'],
      ['Labour', 64, 'text-emerald-400'],
      ['Subcontractors', 97, 'text-amber-400'],
      ['Overheads', 108, 'text-red-400'],
    ].map(([label, pct, color]) => (
      <div key={label}>
        <div className="mb-1 flex justify-between">
          <span className="text-ink-muted">{label}</span>
          <span className={`font-semibold ${color}`}>{pct}% of budget</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-border">
          <div
            className={`h-full rounded-full ${pct > 100 ? 'bg-red-400' : pct > 90 ? 'bg-amber-400' : 'bg-gradient-to-r from-primary to-amber-500'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

const AttendanceMock = () => (
  <div className="space-y-1.5 text-[11px]" aria-hidden="true">
    {[
      ['Mason crew - Tower A', '18 / 20 present', true],
      ['Steel fixers - Basement', '9 / 9 present', true],
      ['Electricians - Floor 4', '6 / 8 present', false],
    ].map(([crew, count, full]) => (
      <div key={crew} className="flex items-center justify-between rounded-md border border-ink-border px-3 py-2.5">
        <span className="font-medium text-ink-foreground">{crew}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${full ? 'bg-emerald-400/15 text-emerald-400' : 'bg-amber-400/15 text-amber-400'}`}>
          {count}
        </span>
      </div>
    ))}
    <div className="pt-1.5 text-ink-muted">Synced from the site app · 2 min ago</div>
  </div>
);

const MOCKS = [BoqMock, BudgetMock, AttendanceMock];

const ProductPreview = () => {
  const { product } = SITE_CONFIG;

  return (
    <section id="product" className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <SectionHeader eyebrow="Product" title={product.heading} sub={product.subheading} />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {product.captions.map((c, i) => {
            const Mock = MOCKS[i] || BoqMock;
            return (
              <Reveal key={c.title} delay={i * 110}>
                <figure className="card-hover h-full overflow-hidden rounded-2xl border border-ink-border bg-ink shadow-lg">
                  <div className="border-b border-ink-border p-4">
                    <Mock />
                  </div>
                  <figcaption className="p-5">
                    <h3 className="font-semibold text-ink-foreground">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{c.text}</p>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductPreview;
