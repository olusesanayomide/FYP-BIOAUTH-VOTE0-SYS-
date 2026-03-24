"use client";

import dynamic from "next/dynamic";

const HowItWorks = dynamic(() => import("@/components/HowItWorks"), { ssr: false });
const SecuritySection = dynamic(() => import("@/components/SecuritySection"), { ssr: false });
const CTASection = dynamic(() => import("@/components/CTASection"), { ssr: false });
const Footer = dynamic(() => import("@/components/Footer"), { ssr: false });

export function LandingClient() {
  return (
    <>
      <HowItWorks />
      <SecuritySection />
      <CTASection />
      <Footer />
    </>
  );
}
