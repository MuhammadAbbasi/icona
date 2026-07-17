'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { SITE_CONFIG, resolveCta } from '@/config';
import { KanbanSnapshot } from './Snapshots';

// Blueprint lines that draw themselves on load (CSS pathLength animation).
const Blueprint = () => (
  <svg
    className="blueprint pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
    viewBox="0 0 1200 800"
    fill="none"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    {/* skyline being drafted */}
    <path pathLength="1" d="M60 640 V420 H180 V300 H260 V640" stroke="#3b82f6" strokeWidth="2" />
    <path pathLength="1" d="M300 640 V240 H420 V180 H500 V640" stroke="#94a3b8" strokeWidth="2" style={{ animationDelay: '0.4s' }} />
    <path pathLength="1" d="M900 640 V360 H1020 V260 H1140 V640" stroke="#94a3b8" strokeWidth="2" style={{ animationDelay: '0.8s' }} />
    {/* crane */}
    <path pathLength="1" d="M700 640 V160 H960 M700 220 L820 160 M960 160 V220" stroke="#3b82f6" strokeWidth="2" style={{ animationDelay: '1.2s' }} />
    {/* dimension line */}
    <path pathLength="1" d="M60 700 H1140 M60 690 V710 M1140 690 V710" stroke="#64748b" strokeWidth="1.5" style={{ animationDelay: '1.6s' }} />
  </svg>
);

const Laptop = ({ lidRotate, screenOpacity, coverOpacity }) => (
  <div className="mx-auto w-[min(760px,88vw)]" style={{ perspective: 1800 }}>
    {/* lid, hinged at its bottom edge */}
    <motion.div
      className="relative origin-bottom overflow-hidden rounded-t-xl border border-ink-border bg-ink shadow-2xl"
      style={{ rotateX: lidRotate, aspectRatio: '16/10' }}
    >
      {/* screen content */}
      <motion.div className="absolute inset-0 p-1.5" style={{ opacity: screenOpacity }}>
        <div className="h-full overflow-hidden rounded-lg ring-1 ring-ink-border">
          <KanbanSnapshot />
        </div>
      </motion.div>
      {/* lid cover, seen while closed */}
      <motion.div
        className="absolute inset-0 grid place-items-center bg-gradient-to-br from-ink to-ink-card"
        style={{ opacity: coverOpacity }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white p-1.5 shadow-lg">
          <img src="/logo-icon.png" alt="ICONA Logo" className="h-full w-full object-contain" />
        </div>
      </motion.div>
      {/* screen glow */}
      <motion.div className="pointer-events-none absolute inset-0 bg-primary/10 mix-blend-screen" style={{ opacity: screenOpacity }} />
    </motion.div>
    {/* base / keyboard deck */}
    <div className="relative h-3.5 rounded-b-xl bg-gradient-to-b from-slate-600 to-slate-800 shadow-xl">
      <div className="absolute left-1/2 top-0 h-1 w-20 -translate-x-1/2 rounded-b-md bg-slate-900" />
    </div>
  </div>
);

const Phone = () => (
  <div className="h-[380px] w-[188px] rounded-[2rem] border border-ink-border bg-ink p-2 shadow-2xl">
    <div className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-ink-border" />
    <div className="h-[calc(100%-14px)] overflow-hidden rounded-[1.4rem] ring-1 ring-ink-border">
      <KanbanSnapshot compact />
    </div>
  </div>
);

// Pinned scroll sequence: hero copy -> laptop opens -> phone joins.
// With reduced motion (or no JS pin support) it renders as a static hero.
const ScrollShowcase = () => {
  const { hero } = SITE_CONFIG;
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

  // hero copy fades up and out
  const heroOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.16], [0, -70]);
  // laptop rises from the bottom and grows to center stage
  const laptopY = useTransform(scrollYProgress, [0, 0.34], ['46vh', '6vh']);
  const laptopScale = useTransform(scrollYProgress, [0, 0.34], [0.66, 1]);
  // lid opens
  const lidRotate = useTransform(scrollYProgress, [0.2, 0.5], [-88, 0]);
  const screenOpacity = useTransform(scrollYProgress, [0.34, 0.48], [0, 1]);
  const coverOpacity = useTransform(scrollYProgress, [0.34, 0.44], [1, 0]);
  // laptop yields the center, phone slides in from the right
  const laptopX = useTransform(scrollYProgress, [0.58, 0.78], ['0%', '-14%']);
  const phoneX = useTransform(scrollYProgress, [0.6, 0.8], ['160%', '0%']);
  const phoneOpacity = useTransform(scrollYProgress, [0.6, 0.72], [0, 1]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  const heroCopy = (
    <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center md:pt-28">
      <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
        {hero.badge}
      </span>
      <h1 className="mx-auto mt-6 text-[clamp(2.3rem,5.5vw,4rem)] font-extrabold leading-[1.08] tracking-tight text-white">
        {hero.title.replace(hero.highlight, '')}
        <span className="text-gradient">{hero.highlight}</span>
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">{hero.subtitle}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={resolveCta(hero.primaryCta.href)}
          className="btn-press inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-sky-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-primary/40 transition-shadow hover:shadow-xl hover:shadow-primary/50"
        >
          {hero.primaryCta.label} <ArrowRight size={18} />
        </a>
        <a
          href={hero.secondaryCta.href}
          className="btn-press rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
        >
          {hero.secondaryCta.label}
        </a>
      </div>
      <p className="mt-4 text-sm text-slate-500">{hero.footnote}</p>
    </div>
  );

  // Static fallback: same content, no pin, laptop open, phone alongside.
  if (reduceMotion) {
    return (
      <section id="top" className="relative overflow-hidden bg-ink pb-20">
        <Blueprint />
        {heroCopy}
        <div className="relative z-10 mx-auto mt-14 flex max-w-5xl flex-col items-center gap-8 px-6 md:flex-row md:justify-center">
          <Laptop lidRotate={0} screenOpacity={1} coverOpacity={0} />
          <Phone />
        </div>
      </section>
    );
  }

  return (
    <section id="top" ref={ref} className="relative h-[340vh] bg-ink">
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
        <Blueprint />

        <motion.div style={{ opacity: heroOpacity, y: heroY }}>{heroCopy}</motion.div>

        <motion.div className="relative z-10 mt-auto pb-[8vh]" style={{ y: laptopY, scale: laptopScale, x: laptopX }}>
          <Laptop lidRotate={lidRotate} screenOpacity={screenOpacity} coverOpacity={coverOpacity} />
        </motion.div>

        <motion.div
          className="absolute right-[8%] top-1/2 z-20 -translate-y-1/2"
          style={{ x: phoneX, opacity: phoneOpacity }}
        >
          <Phone />
        </motion.div>

        <motion.div
          className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-slate-500"
          style={{ opacity: hintOpacity }}
        >
          <span className="flex flex-col items-center gap-1 text-xs font-medium">
            {hero.scrollHint}
            <ChevronDown size={16} className="animate-bounce" />
          </span>
        </motion.div>
      </div>
    </section>
  );
};

export default ScrollShowcase;
