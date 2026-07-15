'use client';
import { useState } from 'react';
import { Mail, Phone, ArrowRight } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Contact = () => {
  const { contact } = SITE_CONFIG;
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
    <section id="contact" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Get started</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{contact.heading}</h2>
          <p className="mt-4 text-muted-foreground">{contact.subheading}</p>

          <div className="mt-8 space-y-3 text-sm">
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground">
              <Mail size={18} className="text-primary" /> {contact.email}
            </a>
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 text-muted-foreground hover:text-foreground">
              <Phone size={18} className="text-primary" /> {contact.phone}
            </a>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border bg-card p-6 md:p-8">
          {/* Formspree honeypot: bots fill this, humans do not */}
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Name</span>
              <input name="name" required className="rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Company</span>
              <input name="company" className="rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Work email</span>
              <input type="email" name="email" required className="rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">What would you like to see?</span>
              <textarea name="message" rows={3} className="resize-none rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
            </label>

            <button
              type="submit"
              disabled={status === 'sending' || status === 'sent'}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Request received' : 'Book a demo'}
              {status === 'idle' && <ArrowRight size={18} />}
            </button>

            {status === 'sent' && <p className="text-sm text-primary">Thanks, we will be in touch shortly.</p>}
            {status === 'error' && <p className="text-sm text-destructive">Something went wrong. Please email us directly.</p>}
          </div>
        </form>
      </div>
    </section>
  );
};

export default Contact;
