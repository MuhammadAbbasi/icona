import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SITE_CONFIG } from '@/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
    'construction management software',
    'subcontractor management',
    'construction accounting software',
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
  icons: { icon: '/favicon.svg' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ICONA',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android',
  description: company.subTagline,
  url: company.domain,
  offers: { '@type': 'Offer', category: 'SaaS' },
  publisher: { '@type': 'Organization', name: 'ICONA', url: company.domain },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        {children}
      </body>
    </html>
  );
}
