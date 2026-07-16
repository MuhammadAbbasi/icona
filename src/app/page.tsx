import type { Metadata } from 'next';
import Navbar from '@/components/website/Navbar';
import Hero from '@/components/website/Hero';
import Modules from '@/components/website/Modules';
import ProductPreview from '@/components/website/ProductPreview';
import MobileApp from '@/components/website/MobileApp';
import HowItWorks from '@/components/website/HowItWorks';
import Pricing from '@/components/website/Pricing';
import Testimonials from '@/components/website/Testimonials';
import Guides from '@/components/website/Guides';
import Faq from '@/components/website/Faq';
import Contact from '@/components/website/Contact';
import Footer from '@/components/website/Footer';

export const metadata: Metadata = {
  description:
    'ICONA is ERP and CRM software for small and medium construction companies. Manage BOQ, project control, finance, labour, subcontractors, staff, and the complete ledger in one system, on web and mobile.',
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Modules />
        <ProductPreview />
        <MobileApp />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <Guides />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
