import Reveal from './Reveal';

const SectionHeader = ({ eyebrow, title, sub, dark = false }) => (
  <Reveal className="mx-auto max-w-2xl text-center">
    <p className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
    <h2 className={`mt-3 text-3xl font-bold tracking-tight md:text-4xl ${dark ? 'text-ink-foreground' : ''}`}>{title}</h2>
    {sub && <p className={`mt-4 text-lg ${dark ? 'text-ink-muted' : 'text-muted-foreground'}`}>{sub}</p>}
  </Reveal>
);

export default SectionHeader;
