'use client';
import { useState } from 'react';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const FILTERS = ['All', 'Residential', 'Commercial'];

const Projects = () => {
  const [active, setActive] = useState('All');

  const filtered = active === 'All'
    ? SITE_CONFIG.projects
    : SITE_CONFIG.projects.filter((p) => p.category === active);

  return (
    <section className="section projects" id="projects">
      <div className="container">
        <p className="section-eyebrow text-center">Our Work</p>
        <h2 className="section-title">Featured Projects</h2>
        <p className="section-subtitle">
          A curated selection of landmark projects that define our commitment to quality,
          innovation, and architectural excellence across Pakistan.
        </p>

        <div className="project-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-btn${active === f ? ' active' : ''}`}
              onClick={() => setActive(f)}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="projects-grid">
          {filtered.map((p) => (
            <div className="project-card" key={p.id}>
              <Image 
                src={p.image} 
                alt={p.title} 
                className="project-img" 
                width={400} 
                height={300}
                quality={80}
              />
              <div className="project-client-tag">{p.client}</div>
              <div className="project-overlay">
                <div className="project-meta-top">
                  <span className="project-category">{p.category}</span>
                  <span className="project-location">
                    <MapPin size={12} className="pin-icon" /> {p.location}
                  </span>
                </div>
                <h3 className="project-title">{p.title}</h3>
                <p className="project-description">{p.description}</p>
                <a href="#contact" className="project-link">Request Similar →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
