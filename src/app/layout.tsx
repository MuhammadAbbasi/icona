import type { Metadata } from 'next';
import { Montserrat, Roboto, Inter } from 'next/font/google';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${roboto.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
