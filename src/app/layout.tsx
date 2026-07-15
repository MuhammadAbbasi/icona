import type { Metadata } from 'next';
import { Montserrat, Roboto, Inter } from 'next/font/google';
import { SITE_CONFIG } from '@/config';
import './globals.css';
import './website.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://iconservices.pk'),
  title: {
    default: 'ICON Services | Turnkey Construction & Architectural Design Pakistan',
    template: '%s | ICON Services',
  },
  description: 'ICON Services is a PEC C-4 registered construction and architectural firm in Pakistan, delivering premium design, construction, and turnkey handovers since 1997.',
  icons: {
    icon: [{ url: '/assets/logo.jpeg', type: 'image/jpeg' }],
    shortcut: '/assets/logo.jpeg',
    apple: '/assets/logo.jpeg',
  },
  alternates: {
    canonical: 'https://iconservices.pk',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ICON Services | Turnkey Construction & Architectural Design Pakistan',
    description: 'ICON Services is a PEC C-4 registered construction and architectural firm in Pakistan, delivering premium design, construction, and turnkey handovers since 1997.',
    images: ['/assets/hero_architecture_premium.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  name: SITE_CONFIG.company.name,
  url: 'https://iconservices.pk',
  image: `https://iconservices.pk${SITE_CONFIG.images.hero}`,
  telephone: SITE_CONFIG.contact.phone,
  email: SITE_CONFIG.contact.email,
  foundingDate: String(SITE_CONFIG.company.established),
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Office number 312, City Center, Shahrah Faisal',
    addressLocality: 'Karachi',
    addressCountry: 'PK',
  },
  sameAs: Object.values(SITE_CONFIG.contact.socials),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
