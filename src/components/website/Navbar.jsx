'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { SITE_CONFIG } from '@/config';


const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <a href="#" className="logo-container">
          <Image 
            src="/assets/logo.jpeg" 
            alt={SITE_CONFIG.company.name} 
            className="logo-img" 
            width={48}
            height={48}
          />
          <div className="logo-text-wrapper">
            <span className="logo-text-main">ICON</span>
            <span className="logo-text-sub">Services</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <ul className="nav-links">
          {SITE_CONFIG.navLinks.map((link) => (
            <li key={link.name}>
              <a href={link.href} className="nav-link">{link.name}</a>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <a href="/login" className="btn btn-secondary" style={{ marginRight: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>ERP Portal</a>
          <a href="#contact" className="btn btn-primary quote-btn">Get a Quote</a>
          
          {/* Mobile Menu Toggle */}
          <button 
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'menu-open' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <div className={`mobile-nav ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-nav-links">
          {SITE_CONFIG.navLinks.map((link) => (
            <li key={link.name}>
              <a 
                href={link.href} 
                className="mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            </li>
          ))}
          <li>
            <a 
              href="/login" 
              className="btn btn-secondary w-full text-center mt-4"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ERP Portal
            </a>
          </li>
          <li>
            <a 
              href="#contact" 
              className="btn btn-primary w-full text-center mt-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Get a Quote
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
