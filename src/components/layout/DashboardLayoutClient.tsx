'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardTour } from '../dashboard/DashboardTour';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const pathname = usePathname();

  // Automatically close sidebar drawer when path/navigation changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // First-login auto-tour detection and event listener for manual triggers
  useEffect(() => {
    const isCompleted = localStorage.getItem('icona_tour_completed');
    if (isCompleted !== 'true') {
      // Small delay to let the page fully render
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleStartTour = () => {
      setShowTour(true);
    };
    window.addEventListener('start-icona-tour', handleStartTour);
    return () => {
      window.removeEventListener('start-icona-tour', handleStartTour);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar Drawer container - slides in on mobile, behaves as static column on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex-shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
      </div>

      {/* Dark overlay backdrop for mobile sidebar toggle */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main viewport area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top-bar navigation (hidden on desktop) */}
        <header className="flex h-16 items-center border-b px-4 gap-4 bg-background lg:hidden flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="hover:bg-muted/80 rounded-full"
            aria-label="Open side menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded overflow-hidden">
              <img src="/logo.svg" alt="ICONA logo" className="h-full w-full object-cover" />
            </div>
            <span className="font-bold text-sm text-foreground">ICON ERP</span>
          </div>
        </header>

        {/* Dynamic page contents wrapper */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>

      <DashboardTour isOpen={showTour} onClose={() => setShowTour(false)} />
    </div>
  );
}
