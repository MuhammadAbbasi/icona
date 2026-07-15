import Image from 'next/image';
import { SITE_CONFIG } from '@/config';

const Partners = () => {
  // Triple the list so the infinite scroll loop is seamless
  const track = [...SITE_CONFIG.partners, ...SITE_CONFIG.partners, ...SITE_CONFIG.partners];

  return (
    <section className="partners-section">
      <div className="container">
        <p className="section-eyebrow text-center">Trusted By</p>
        <h2 className="section-title">Our Partners & Clients</h2>
      </div>

      <div className="partners-carousel-wrapper">
        <div className="partners-track">
          {track.map((partner, i) => (
            <div className="partner-card" key={`${partner.name}-${i}`}>
              <div className="partner-logo-container">
                {partner.logo ? (
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    className="partner-logo-img"
                    width={75}
                    height={48}
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <div className="partner-logo-placeholder">
                    {partner.name.split(' ').map((w) => w[0]).join('').slice(0, 3)}
                  </div>
                )}
              </div>
              <div>
                <div className="partner-name">{partner.name}</div>
                <div className="partner-industry">{partner.industry}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Partners;
