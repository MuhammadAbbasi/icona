'use client';
import { useEffect, useRef } from 'react';

// Adds .is-in when scrolled into view; CSS in globals.css does the animation.
// Styles are scoped under html.js, so content stays visible without JavaScript.
const Reveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    // Fail-open: if the observer never fires (any browser quirk), reveal anyway —
    // content must never be able to stay invisible.
    const failOpen = setTimeout(() => el.classList.add('is-in'), 2500);
    return () => {
      io.disconnect();
      clearTimeout(failOpen);
    };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms` }}>
      {children}
    </div>
  );
};

export default Reveal;
