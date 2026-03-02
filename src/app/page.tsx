import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TrustBar from "@/components/TrustBar";
import HowItWorks from "@/components/HowItWorks";
import SecuritySection from "@/components/SecuritySection";
import BenefitsGrid from "@/components/BenefitsGrid";
import LiveDemo from "@/components/LiveDemo";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <TrustBar />
      <HowItWorks />
      <SecuritySection />
      <BenefitsGrid />
      <LiveDemo />
      <CTASection />
      <Footer />
    </div>
  );
}
