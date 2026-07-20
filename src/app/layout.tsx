import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { SITE_CONFIG } from '@/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const { company } = SITE_CONFIG;

export const metadata: Metadata = {
  metadataBase: new URL(company.domain),
  title: {
    default: 'ICONA | ERP + CRM Software for Construction Companies',
    template: '%s | ICONA',
  },
  description: company.subTagline,
  keywords: [
    'construction ERP',
    'construction CRM',
    'BOQ software',
    'construction management software Pakistan',
    'subcontractor management',
    'labour attendance software',
    'construction accounting software',
    'construction ledger software',
    'ICONA',
  ],
  alternates: { canonical: company.domain },
  openGraph: {
    title: 'ICONA | ERP + CRM Software for Construction Companies',
    description: company.subTagline,
    url: company.domain,
    siteName: 'ICONA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ICONA | ERP + CRM for Construction Companies',
    description: company.subTagline,
  },
  // type+sizes: some browsers only reliably swap a cached favicon when the
  // link's attributes change, not just its content - a bare href isn't
  // always enough to bust a stale tab-icon cache from before the rebrand.
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' }] },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ICONA',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android',
  description: company.subTagline,
  url: company.domain,
  offers: SITE_CONFIG.pricing.map((tier) => ({
    '@type': 'Offer',
    category: 'SaaS',
    name: tier.name,
    price: tier.monthly,
    priceCurrency: 'USD',
  })),
  publisher: { '@type': 'Organization', name: 'ICONA', url: company.domain },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  );
}
