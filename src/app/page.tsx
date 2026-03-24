import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import { LandingClient } from "@/components/LandingClient";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <LandingClient />
    </div>
  );
}
