import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UnderTheHood } from "@/components/landing/under-the-hood";
import { CtaBand } from "@/components/landing/cta-band";
import { Faq } from "@/components/landing/faq";
import { JsonLd } from "@/components/seo/json-ld";
import { SiteFooter } from "@/components/site-footer";

// Metadata (title, description, canonical, Open Graph) comes from the root layout.
export default function LandingPage() {
  return (
    <>
      <JsonLd />
      <Hero />
      <Features />
      <HowItWorks />
      <UnderTheHood />
      <CtaBand />
      <Faq />
      <SiteFooter />
    </>
  );
}
