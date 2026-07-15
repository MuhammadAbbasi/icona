import { PenTool, HardHat, Key, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const ICONS = { PenTool, HardHat, Key };

const Services = () => {
  return (
    <section className="section services" id="services">
      <div className="container">
        <p className="section-eyebrow text-center">What We Do</p>
        <h2 className="section-title">Our Core Services</h2>
        <p className="section-subtitle">
          From initial blueprints to final handover, ICON Services delivers full-scope
          construction solutions with unmatched quality and precision.
        </p>

        <div className="services-grid">
          {SITE_CONFIG.services.map((svc) => {
            const Icon = ICONS[svc.icon] ?? PenTool;
            return (
              <div className="service-card" key={svc.id}>
                <div className="service-icon-wrapper">
                  <Icon size={32} className="service-icon" />
                </div>
                <h3 className="service-title">{svc.title}</h3>
                <p className="service-description">{svc.description}</p>
                <a href="#contact" className="service-link">
                  Learn More <ArrowRight size={14} style={{ display: 'inline', marginLeft: 4 }} />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
