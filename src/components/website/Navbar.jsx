'use client';
import { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { SITE_CONFIG, resolveCta } from '@/config';

const Logo = () => (
  <a href="#top" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-amber-500 text-sm font-black text-primary-foreground">
      I
    </span>
    <span>ICONA</span>
  </a>
);

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { nav, hero } = SITE_CONFIG;
  const signupUrl = resolveCta('signup');
  const loginUrl = resolveCta('login');

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/75 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo />

        <div className="hidden items-center gap-7 lg:flex">
          {nav.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.name}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <a href={loginUrl} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Log in
          </a>
          <a
            href={signupUrl}
            className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-orange-500 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-shadow hover:shadow-lg hover:shadow-primary/30"
          >
            {hero.primaryCta.label} <ArrowRight size={15} />
          </a>
        </div>

        <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'}>
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
            <a href={signupUrl} onClick={() => setOpen(false)} className="btn-press mt-2 rounded-lg bg-gradient-to-r from-primary to-orange-500 px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
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
