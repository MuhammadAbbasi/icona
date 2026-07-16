'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';

export function InactivityTimeout() {
  const { data: session } = useSession();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session) return;

    const logout = () => {
      signOut({ callbackUrl: '/login' });
    };

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(logout, 15 * 60 * 1000); // 15 minutes
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Set initial timer
    resetTimer();

    // Listen for activity events
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session]);

  return null;
}
