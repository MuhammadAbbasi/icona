import { SITE_CONFIG } from '@/config';

const TurnkeyProcess = () => {
  return (
    <section className="section process">
      <div className="container">
        <p className="section-eyebrow text-center" style={{ color: 'var(--color-gold)' }}>How We Work</p>
        <h2 className="section-title text-white">Our Turnkey Process</h2>
        <p className="section-subtitle text-slate-light">
          A transparent, step-by-step approach that takes your project from initial
          concept to complete delivery — on time and on budget.
        </p>

        <div className="process-timeline">
          {SITE_CONFIG.processSteps.map((step) => (
            <div className="process-step" key={step.number}>
              <div className="step-number">{step.number}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TurnkeyProcess;
