'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './ThemeProvider';
import { InactivityTimeout } from '../auth/InactivityTimeout';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {children}
        <InactivityTimeout />
      </ThemeProvider>
    </SessionProvider>
  );
}
