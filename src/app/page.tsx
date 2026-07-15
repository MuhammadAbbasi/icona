import type { Metadata } from 'next';
import Navbar from '@/components/website/Navbar';
import Hero from '@/components/website/Hero';
import About from '@/components/website/About';
import Services from '@/components/website/Services';
import Projects from '@/components/website/Projects';
import ProjectMap from '@/components/website/ProjectMap';
import Partners from '@/components/website/Partners';
import TurnkeyProcess from '@/components/website/TurnkeyProcess';
import Testimonials from '@/components/website/Testimonials';
import Contact from '@/components/website/Contact';
import Footer from '@/components/website/Footer';

export const metadata: Metadata = {
  description: 'ICON Services is a leading PEC C-4 registered construction and architectural firm in Pakistan. Specializing in turnkey residential bungalow builds, high-end corporate office interior design, and commercial infrastructure projects with 29+ years of excellence.',
  keywords: ['construction company karachi', 'architects in pakistan', 'turnkey construction karachi', 'corporate office design pakistan', 'DHA karachi builder', 'ICON Services'],
  openGraph: {
    title: 'ICON Services | Turnkey Construction & Architectural Design Pakistan',
    description: 'Delivering premium design, construction, and turnkey project handovers across Pakistan since 1997.',
    url: 'https://iconservices.pk',
    type: 'website',
    images: [
      {
        url: '/assets/hero_architecture_premium.png',
        width: 1200,
        height: 630,
        alt: 'ICON Services Architecture & Construction',
      },
    ],
  },
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <Projects />
        <ProjectMap />
        <Partners />
        <TurnkeyProcess />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
