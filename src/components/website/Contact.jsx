'use client';
import { useState } from 'react';
import { MapPin, Phone, Mail, Send, Loader } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Contact = () => {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', service: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch(`https://formspree.io/f/${SITE_CONFIG.contact.formspreeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="section contact-section" id="contact">
      <div className="container">
        <p className="section-eyebrow text-center">Get In Touch</p>
        <h2 className="section-title">Start Your Project</h2>
        <p className="section-subtitle">
          Ready to bring your vision to life? Reach out and our team will get back
          to you within 24 hours.
        </p>

        <div className="contact-grid">
          <div className="contact-info">
            <h3 className="info-title">Contact Information</h3>
            <p className="info-intro">Reach us directly or fill out the form and we'll get back to you shortly.</p>

            <ul className="info-list">
              <li className="info-item">
                <div className="info-icon-wrapper"><MapPin size={20} /></div>
                <div>
                  <h4>Office Address</h4>
                  <p>{SITE_CONFIG.contact.address}</p>
                </div>
              </li>
              <li className="info-item">
                <div className="info-icon-wrapper"><Phone size={20} /></div>
                <div>
                  <h4>Phone</h4>
                  <p>{SITE_CONFIG.contact.phone}</p>
                </div>
              </li>
              <li className="info-item">
                <div className="info-icon-wrapper"><Mail size={20} /></div>
                <div>
                  <h4>Email</h4>
                  <p>{SITE_CONFIG.contact.email}</p>
                </div>
              </li>
            </ul>

            <div className="contact-socials-wrapper">
              <h4>Follow Us</h4>
              <div className="contact-social-links">
                <a href={SITE_CONFIG.contact.socials.linkedin} target="_blank" rel="noreferrer" className="contact-social-link" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" />
                  </svg>
                </a>
                <a href={SITE_CONFIG.contact.socials.instagram} target="_blank" rel="noreferrer" className="contact-social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
                <a href={SITE_CONFIG.contact.socials.facebook} target="_blank" rel="noreferrer" className="contact-social-link" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            {status === 'success' ? (
              <div className="submission-success">
                Thank you! Your message has been sent. We'll be in touch within 24 hours.
              </div>
            ) : (
              <form className="premium-contact-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input id="name" name="name" type="text" placeholder="Your full name" required value={form.name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="company">Company</label>
                    <input id="company" name="company" type="text" placeholder="Your company" value={form.company} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input id="email" name="email" type="email" placeholder="your@email.com" required value={form.email} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" name="phone" type="tel" placeholder="+92 300 0000000" value={form.phone} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="service">Service Required</label>
                  <select id="service" name="service" value={form.service} onChange={handleChange}>
                    <option value="">Select a service...</option>
                    {SITE_CONFIG.services.map((s) => (
                      <option key={s.id} value={s.title}>{s.title}</option>
                    ))}
                    <option value="Other">Other / Not Sure</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Project Details *</label>
                  <textarea id="message" name="message" rows={5} placeholder="Describe your project, location, and timeline..." required value={form.message} onChange={handleChange} />
                </div>

                {status === 'error' && (
                  <p style={{ color: '#e53e3e', fontSize: '0.9rem' }}>
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}

                <button type="submit" className="btn btn-primary submit-btn" disabled={status === 'sending'}>
                  {status === 'sending'
                    ? <><Loader size={18} className="spinning-icon" /> Sending...</>
                    : <><Send size={18} /> Send Message</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
