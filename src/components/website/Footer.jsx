import { SITE_CONFIG } from '@/config';

const Footer = () => {
  const { company, nav, footer, contact } = SITE_CONFIG;

  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">I</span>
            ICONA
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">{footer.blurb}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Product</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {nav.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-muted-foreground hover:text-foreground">{l.name}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><a href={`mailto:${contact.email}`} className="hover:text-foreground">{contact.email}</a></li>
            <li><a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="hover:text-foreground">{contact.phone}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-5 text-xs text-muted-foreground">
          &copy; {footer.year} {company.name}. ERP + CRM for construction companies.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
