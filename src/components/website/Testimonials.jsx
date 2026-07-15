'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SITE_CONFIG } from '@/config';

const Testimonials = () => {
  const [current, setCurrent] = useState(0);
  const items = SITE_CONFIG.testimonials;

  const prev = () => setCurrent((c) => (c - 1 + items.length) % items.length);
  const next = () => setCurrent((c) => (c + 1) % items.length);

  const { quote, author, designation } = items[current];

  return (
    <section className="section testimonials">
      <div className="container">
        <p className="section-eyebrow text-center">Client Stories</p>
        <h2 className="section-title">What Our Clients Say</h2>

        <div className="testimonial-slider">
          <button className="slider-btn prev" onClick={prev} aria-label="Previous">
            <ChevronLeft size={24} />
          </button>

          <div className="testimonial-content">
            <svg className="quote-icon" width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>

            <p className="testimonial-quote">"{quote}"</p>

            <div className="testimonial-author">
              <h4>{author}</h4>
              <p>{designation}</p>
            </div>

            <div className="slider-dots">
              {items.map((_, i) => (
                <button
                  key={i}
                  className={`dot${i === current ? ' active' : ''}`}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <button className="slider-btn next" onClick={next} aria-label="Next">
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
