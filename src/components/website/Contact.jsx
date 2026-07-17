'use client';
import { useState } from 'react';
import { Mail, Phone, ArrowRight } from 'lucide-react';
import { SITE_CONFIG, resolveCta } from '@/config';
import Reveal from './Reveal';

const Contact = () => {
  const { contact, hero, billing } = SITE_CONFIG;
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`https://formspree.io/f/${contact.formspreeId}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setStatus('sent');
        e.target.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="contact" className="relative overflow-hidden bg-ink text-ink-foreground">
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-0 h-96 w-[50rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Get started</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{contact.heading}</h2>
          <p className="mt-4 text-lg text-ink-muted">{contact.subheading}</p>

          <a
            href={resolveCta(hero.primaryCta.href)}
            className="btn-press mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-sky-500 px-7 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-shadow hover:shadow-xl hover:shadow-primary/40"
          >
            Sign up now <ArrowRight size={18} />
          </a>
          <p className="mt-3 text-sm text-ink-muted">{hero.footnote} {billing.note}</p>

          <div className="mt-10 space-y-3 text-sm">
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-ink-muted transition-colors hover:text-ink-foreground">
              <Mail size={18} className="text-primary" /> {contact.email}
            </a>
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-ink-muted transition-colors hover:text-ink-foreground">
              <Phone size={18} className="text-primary" /> {contact.phone}
            </a>
          </div>
        </Reveal>

        <Reveal delay={130}>
          <form onSubmit={onSubmit} className="rounded-2xl border border-ink-border bg-ink-card p-6 shadow-2xl md:p-8">
            <h3 className="font-display text-lg font-bold">Book a demo</h3>
            <p className="mt-1 text-sm text-ink-muted">We will walk you through ICONA on your own numbers.</p>

            {/* Formspree honeypot: bots fill this, humans do not */}
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Name</span>
                <input name="name" required className="rounded-lg border border-ink-border bg-ink px-3 py-2.5 text-ink-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Company</span>
                <input name="company" className="rounded-lg border border-ink-border bg-ink px-3 py-2.5 text-ink-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Work email</span>
                <input type="email" name="email" required className="rounded-lg border border-ink-border bg-ink px-3 py-2.5 text-ink-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">What would you like to see?</span>
                <textarea name="message" rows={3} className="resize-none rounded-lg border border-ink-border bg-ink px-3 py-2.5 text-ink-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring" />
              </label>

              <button
                type="submit"
                disabled={status === 'sending' || status === 'sent'}
                className="btn-press inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-sky-500 px-5 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Request received' : 'Book a demo'}
                {status === 'idle' && <ArrowRight size={18} />}
              </button>

              {status === 'sent' && <p className="text-sm text-primary">Thanks, we will be in touch shortly.</p>}
              {status === 'error' && <p className="text-sm text-red-400">Something went wrong. Please email us directly.</p>}
            </div>
          </form>
        </Reveal>
      </div>
    </section>
  );
};

export default Contact;
