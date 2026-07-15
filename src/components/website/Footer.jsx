'use client';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config';


const Footer = () => {
  return (
    <footer className="footer" id="contact">
      <div className="container">
        <div className="footer-grid">
          
          <div className="footer-brand">
            <a href="#" className="logo-container mb-6">
              <Image 
                src="/assets/logo.jpeg" 
                alt={SITE_CONFIG.company.name} 
                className="logo-img" 
                width={48} 
                height={48} 
              />
              <div className="logo-text-wrapper">
                <span className="logo-text-main text-white">ICON</span>
                <span className="logo-text-sub">Services</span>
              </div>
            </a>
            <p className="footer-desc">
              {SITE_CONFIG.company.tagline}. Delivering premium architectural and construction services since {SITE_CONFIG.company.established}.
            </p>
            <div className="social-links">
              <a href={SITE_CONFIG.contact.socials.linkedin} target="_blank" rel="noreferrer" className="social-link" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a href={SITE_CONFIG.contact.socials.instagram} target="_blank" rel="noreferrer" className="social-link" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href={SITE_CONFIG.contact.socials.facebook} target="_blank" rel="noreferrer" className="social-link" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              {SITE_CONFIG.navLinks.map(link => (
                <li key={link.name}><a href={link.href}>{link.name}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-title">Contact Us</h4>
            <ul className="footer-contact">
              <li>
                <MapPin size={18} className="contact-icon" />
                <span>{SITE_CONFIG.contact.address}</span>
              </li>
              <li>
                <Phone size={18} className="contact-icon" />
                <span>{SITE_CONFIG.contact.phone}</span>
              </li>
              <li>
                <Mail size={18} className="contact-icon" />
                <span>{SITE_CONFIG.contact.email}</span>
              </li>
            </ul>
          </div>

          <div className="footer-newsletter">
            <h4 className="footer-title">Newsletter</h4>
            <p>Subscribe to receive our latest updates and insights.</p>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Your email address" required />
              <button type="submit" aria-label="Subscribe to newsletter">
                <ArrowRight size={20} />
              </button>
            </form>
          </div>

        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.company.name}. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
