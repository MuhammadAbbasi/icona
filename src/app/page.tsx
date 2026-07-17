import type { Metadata } from 'next';
import Navbar from '@/components/website/Navbar';
import ScrollShowcase from '@/components/website/ScrollShowcase';
import Modules from '@/components/website/Modules';
import HowItWorks from '@/components/website/HowItWorks';
import WhySwitch from '@/components/website/WhySwitch';
import Testimonials from '@/components/website/Testimonials';
import Pricing from '@/components/website/Pricing';
import Guides from '@/components/website/Guides';
import Faq from '@/components/website/Faq';
import Contact from '@/components/website/Contact';
import Footer from '@/components/website/Footer';

export const metadata: Metadata = {
  description:
    'ICONA is the all-in-one portal for construction companies: Kanban workflows, project tracking, financial management, and a client portal - on web and mobile.',
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <ScrollShowcase />
        <Modules />
        <HowItWorks />
        <WhySwitch />
        <Testimonials />
        <Pricing />
        <Guides />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
