'use client';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { SITE_CONFIG, resolveCta } from '@/config';

const Logo = ({ light }) => (
  <a href="#top" className={`flex items-center gap-2 font-display text-lg font-bold tracking-tight ${light ? 'text-white' : ''}`}>
    <div className="grid h-8 w-8 place-items-center">
      <img src="/logo-icon.png" alt="ICONA Logo" className="h-full w-full object-contain" />
    </div>
    <span>ICONA</span>
  </a>
);

// Transparent over the dark hero, solid + blurred once the page scrolls.
const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { nav, hero } = SITE_CONFIG;
  const signupUrl = resolveCta('signup');
  const loginUrl = resolveCta('login');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const light = !scrolled && !open; // over the dark hero

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-border/60 bg-background/80 shadow-sm backdrop-blur-lg' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo light={light} />

        <div className="hidden items-center gap-7 lg:flex">
          {nav.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${
                light ? 'text-slate-300 hover:text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {l.name}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={loginUrl}
            className={`text-sm font-medium transition-colors ${
              light ? 'text-slate-300 hover:text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Log in
          </a>
          <a
            href={signupUrl}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-sky-500 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-shadow hover:shadow-lg hover:shadow-primary/30"
          >
            {hero.primaryCta.label} <ArrowRight size={15} />
          </a>
        </div>

        <button
          className={`lg:hidden ${light ? 'text-white' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-sm text-muted-foreground hover:text-foreground">
                {l.name}
              </a>
            ))}
            <a href={loginUrl} className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Log in
            </a>
            <a href={signupUrl} onClick={() => setOpen(false)} className="btn-press mt-2 rounded-lg bg-gradient-to-r from-primary to-sky-500 px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
              {hero.primaryCta.label}
            </a>
            <a href={hero.secondaryCta.href} onClick={() => setOpen(false)} className="mt-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold">
              {hero.secondaryCta.label}
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
