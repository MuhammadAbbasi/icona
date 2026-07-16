import { Linkedin, Instagram, Facebook } from 'lucide-react';
import { SITE_CONFIG, resolveCta } from '@/config';

const SOCIAL_ICONS = { linkedin: Linkedin, instagram: Instagram, facebook: Facebook };

const Footer = () => {
  const { company, nav, footer, contact } = SITE_CONFIG;
  const socials = Object.entries(contact.socials).filter(([, url]) => url);

  return (
    <footer className="border-t border-ink-border bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-amber-500 text-sm font-black text-primary-foreground">I</span>
            ICONA
          </div>
          <p className="mt-4 max-w-sm text-sm text-ink-muted">{footer.blurb}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-3">
              {socials.map(([name, url]) => {
                const Icon = SOCIAL_ICONS[name];
                return (
                  <a key={name} href={url} aria-label={name} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-border text-ink-muted transition-colors hover:border-primary hover:text-primary">
                    {Icon && <Icon size={16} />}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold">Product</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-ink-muted transition-colors hover:text-ink-foreground">{l.name}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Account</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href={resolveCta('signup')} className="text-ink-muted transition-colors hover:text-ink-foreground">Sign up</a></li>
            <li><a href={resolveCta('login')} className="text-ink-muted transition-colors hover:text-ink-foreground">Log in</a></li>
            <li><a href="#pricing" className="text-ink-muted transition-colors hover:text-ink-foreground">Pricing</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li><a href={`mailto:${contact.email}`} className="transition-colors hover:text-ink-foreground">{contact.email}</a></li>
            <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="transition-colors hover:text-ink-foreground">{contact.phone}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-border">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-ink-muted">
          &copy; {footer.year} {company.name}. ERP + CRM for construction companies.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
