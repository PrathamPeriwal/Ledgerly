import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UnderTheHood } from "@/components/landing/under-the-hood";
import { CtaBand } from "@/components/landing/cta-band";
import { SiteFooter } from "@/components/site-footer";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <UnderTheHood />
      <CtaBand />
      <SiteFooter />
    </>
  );
}
