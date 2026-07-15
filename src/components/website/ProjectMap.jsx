'use client';
import { useState } from 'react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config';

const pakistanMap = '/assets/pakistan_dark_map.png';

const ProjectMap = () => {
  const [activeCity, setActiveCity] = useState(null);

  // Calculate total metrics across all mapped cities
  const totalCommercial = SITE_CONFIG.cityFootprint.reduce((acc, curr) => acc + curr.commercial, 0);
  const totalResidential = SITE_CONFIG.cityFootprint.reduce((acc, curr) => acc + curr.residential, 0);
  const totalMappedProjects = SITE_CONFIG.cityFootprint.reduce((acc, curr) => acc + curr.projectCount, 0);

  return (
    <section className="project-map-section" id="footprint">
      <div className="container map-header-container">
        <div className="section-header text-center">
          <span className="subtitle">Our Impact</span>
          <h2 className="title">Our Regional Footprint</h2>
          <div className="title-divider"></div>
          <p className="description">
            A static visual breakdown of our {SITE_CONFIG.company.yearsOfExcellence}-year legacy showing turnkey projects executed across major metropolitan hubs of Pakistan.
          </p>
        </div>
      </div>

      <div className="container map-centered-content-wrapper">
        {/* Symmetrical Centered Map Container */}
        <div className="map-view-column-centered">
          <div className="map-wrapper-outer static-map-mode">
            <Image 
              src={pakistanMap} 
              alt="Official UNDIVIDED Map of Pakistan - Survey of Pakistan Compliant" 
              className="static-map-bg-img"
              width={680}
              height={680}
              quality={90}
            />

            {/* Absolute Positioned City Pins */}
            <div className="static-pins-overlay">
              {SITE_CONFIG.cityFootprint.map((city) => {
                const isActive = activeCity?.id === city.id;
                return (
                  <button
                    key={city.id}
                    className={`city-pin-wrapper pin-${city.id} ${isActive ? 'active' : ''}`}
                    style={{ left: `${city.x}%`, top: `${city.y}%` }}
                    onClick={() => setActiveCity(isActive ? null : city)}
                    aria-label={`View projects in ${city.cityName}`}
                  >
                    {/* Sonar Beacon glowing rings */}
                    <div className="marker-sonar-pulse"></div>
                    <div className="marker-beacon-core project-count-beacon">
                      <span className="pin-project-count">{city.projectCount}</span>
                    </div>

                    {/* Minimal City Tooltip Label */}
                    <div className="city-pin-label">
                      <span className="city-pin-name">{city.cityName}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Glassmorphic Details Card Overlay */}
            {activeCity && (
              <div className="map-centered-overlay-card">
                <button 
                  className="overlay-close-btn" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCity(null);
                  }}
                  aria-label="Close active city details"
                >
                  &times;
                </button>
                <div className="overlay-card-header">
                  <span className="overlay-subtitle">Regional Impact</span>
                  <h3 className="overlay-title">{activeCity.cityName}</h3>
                  <span className="overlay-established">Operational Hub</span>
                </div>
                <div className="overlay-metrics-grid">
                  <div className="overlay-metric-item">
                    <span className="overlay-metric-val">{activeCity.projectCount}</span>
                    <span className="overlay-metric-lbl">Total Projects</span>
                  </div>
                  <div className="overlay-metric-divider"></div>
                  <div className="overlay-metric-item">
                    <span className="overlay-metric-val">{activeCity.commercial + activeCity.residential}</span>
                    <span className="overlay-metric-lbl">Assets</span>
                  </div>
                </div>
                <div className="overlay-breakdown-section">
                  <div className="overlay-breakdown-row">
                    <span className="breakdown-lbl">Commercial Assets</span>
                    <span className="breakdown-num">{activeCity.commercial}</span>
                  </div>
                  <div 
                    className="overlay-progress-bar commercial" 
                    style={{ '--progress-pct': `${(activeCity.commercial / activeCity.projectCount) * 100}%` }}
                  ></div>

                  <div className="overlay-breakdown-row">
                    <span className="breakdown-lbl">Residential Assets</span>
                    <span className="breakdown-num">{activeCity.residential}</span>
                  </div>
                  <div 
                    className="overlay-progress-bar residential" 
                    style={{ '--progress-pct': `${(activeCity.residential / activeCity.projectCount) * 100}%` }}
                  ></div>
                </div>
                <div className="overlay-highlights-section">
                  <span className="overlay-highlights-title">Key Projects &amp; Highlights</span>
                  <ul className="overlay-highlights-list">
                    {activeCity.highlights.map((highlight, index) => (
                      <li className="overlay-highlight-item" key={index}>
                        <span className="bullet">•</span>
                        <span className="text">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Heritage Stamp Overlay */}
            <div className="map-heritage-badge">
              <span className="heritage-icon">📍</span>
              <div className="heritage-text">
                <span className="heritage-label">ICON SERVICES</span>
                <span className="heritage-val">LEGACY SINCE 1997</span>
              </div>
            </div>
          </div>
        </div>

        {/* All-Pakistan Operational Capacity Stats row directly below the map */}
        <div className="national-stats-row-centered">
          <div className="national-stats-title">All-Pakistan Operational Capacity</div>
          <div className="national-stats-grid-centered">
            <div className="stat-unit-centered">
              <span className="val">{totalMappedProjects}+</span>
              <span className="lbl">Mapped Projects</span>
            </div>
            <div className="stat-unit-divider"></div>
            <div className="stat-unit-centered">
              <span className="val">{totalCommercial}</span>
              <span className="lbl">Commercial Assets</span>
            </div>
            <div className="stat-unit-divider"></div>
            <div className="stat-unit-centered">
              <span className="val">{totalResidential}</span>
              <span className="lbl">Residential Assets</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectMap;
