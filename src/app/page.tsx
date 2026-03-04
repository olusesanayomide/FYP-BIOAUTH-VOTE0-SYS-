import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import SecuritySection from "@/components/SecuritySection";
import LiveDemo from "@/components/LiveDemo";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <SecuritySection />
      <LiveDemo />
      <CTASection />
      <Footer />
    </div>
  );
}
