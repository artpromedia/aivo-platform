import { HeroSection } from '@/components/marketing/hero';
import { CTA } from '@/components/sections/cta';
import { Features } from '@/components/sections/features';
import { HowItWorks } from '@/components/sections/how-it-works';
import { Pricing } from '@/components/sections/pricing';
import { Testimonials } from '@/components/sections/testimonials';
import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';

export default function HomePage() {
  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero - Above the fold */}
        <HeroSection />

        {/* Features - Core value proposition */}
        <Features />

        {/* How It Works - Reduce friction */}
        <HowItWorks />

        {/* Testimonials - Social proof */}
        <Testimonials />

        {/* Pricing - Conversion */}
        <Pricing />

        {/* Final CTA - Last chance conversion */}
        <CTA />
      </main>

      <Footer />
    </>
  );
}
