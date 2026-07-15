'use client';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config';

const Hero = () => {
  return (
    <section className="hero">
      <Image 
        src={SITE_CONFIG.images.hero}
        alt="Premium Turnkey Construction and Architecture by ICON Services"
        fill
        priority
        quality={90}
        sizes="100vw"
        style={{ objectFit: 'cover', zIndex: 0 }}
      />
      <div className="hero-overlay" style={{ zIndex: 1 }} />
      <div className="container hero-container" style={{ zIndex: 2 }}>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-highlight">{SITE_CONFIG.company.yearsOfExcellence}+</span>
            <span className="badge-divider" />
            <span>Years of Excellence</span>
            <span className="badge-divider" />
            <span>{SITE_CONFIG.company.pecCategory}</span>
          </div>

          <h1 className="hero-title">
            {SITE_CONFIG.company.tagline}
          </h1>

          <p className="hero-subtitle">
            {SITE_CONFIG.company.subTagline}
          </p>

          <div className="hero-actions">
            <a href="#projects" className="btn btn-primary">View Our Projects</a>
            <a href="#contact" className="btn btn-secondary">Get a Quote</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
