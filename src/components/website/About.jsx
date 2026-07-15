import { ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/config';

const About = () => {
  return (
    <section className="section about" id="about">
      <div className="container">
        <div className="about-grid">

          <div className="about-image-container">
            <Image
              src={SITE_CONFIG.images.legacy}
              alt="ICON Services — Legacy of Excellence"
              className="about-img"
              width={500}
              height={625}
              quality={85}
            />
            <div className="experience-badge">
              <span className="experience-number">{SITE_CONFIG.company.yearsOfExcellence}</span>
              <span className="experience-text">Years of<br />Excellence</span>
            </div>
          </div>

          <div className="about-text-content">
            <p className="section-eyebrow">Who We Are</p>
            <h2 className="section-title text-left">
              Building Pakistan's Skyline Since {SITE_CONFIG.company.established}
            </h2>

            <div className="pec-badge-container">
              <span className="pec-badge-icon"><ShieldCheck size={16} /></span>
              <span>{SITE_CONFIG.company.pecCategory}</span>
            </div>

            <p className="about-text">
              ICON Services is a premier construction and architectural firm delivering end-to-end
              project solutions across Pakistan. From conceptual design to turnkey completion,
              we combine engineering precision with architectural elegance.
            </p>
            <p className="about-text">
              With a track record spanning {SITE_CONFIG.company.yearsOfExcellence} years and
              projects from Karachi to Islamabad, we serve government bodies, financial
              institutions, and private developers with equal dedication.
            </p>

            <div className="milestones-grid">
              {SITE_CONFIG.milestones.map((m) => (
                <div className="milestone-item" key={m.label}>
                  <div className="milestone-value">{m.value}{m.suffix}</div>
                  <div className="milestone-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default About;
