'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Logo = () => (
  <a href="#top" className="flex items-center gap-2 text-lg font-bold tracking-tight">
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
      I
    </span>
    <span>ICONA</span>
  </a>
);

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { nav, hero, company } = SITE_CONFIG;
  const loginUrl = `${company.appUrl}/login`;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          {nav.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.name}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          <a href={loginUrl} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Client login
          </a>
          <a href={hero.primaryCta.href} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            {hero.primaryCta.label}
          </a>
        </div>

        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-4">
            {nav.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-2 text-sm text-muted-foreground hover:text-foreground">
                {l.name}
              </a>
            ))}
            <a href={loginUrl} className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              Client login
            </a>
            <a href={hero.primaryCta.href} onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
              {hero.primaryCta.label}
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
