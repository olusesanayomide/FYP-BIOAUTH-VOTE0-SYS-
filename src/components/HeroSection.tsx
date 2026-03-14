"use client";

import { motion } from "framer-motion";
import { ChevronRight, Fingerprint, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const HeroSection = () => {
  const router = useRouter();
  const [isNavigatingToLogin, setIsNavigatingToLogin] = useState(false);
  const handleLoginClick = () => {
    if (isNavigatingToLogin) return;
    setIsNavigatingToLogin(true);
    router.push("/login");
  };

  return (
    <section id="home" className="relative min-h-[88vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-background to-background dark:from-[#060b1a] dark:via-[#071633] dark:to-[#060b1a]">
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] rounded-full bg-primary/10 dark:bg-[#3b82f6]/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[320px] h-[320px] rounded-full bg-accent/10 dark:bg-[#2563eb]/20 blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-24 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] max-w-[22ch] mx-auto">
            {"Secured By Your Identity".split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                className="inline-block mr-3"
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mx-auto mt-8 mb-7 w-24 h-24 rounded-full border border-primary/30 bg-card/70 dark:bg-white/[0.04] backdrop-blur-xl flex items-center justify-center"
          >
            <Fingerprint className="w-10 h-10 text-primary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/80 bg-card/70 dark:bg-white/[0.04] backdrop-blur-sm mb-6"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
              Identity-Bound Security
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-8"
          >
            A modern digital voting platform where biometric identity, transparent analytics, and encrypted ballots create trust at scale.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex justify-center"
          >
            <button
              onClick={handleLoginClick}
              disabled={isNavigatingToLogin}
             className="bg-primary text-primary-foreground font-medium px-7 py-3 rounded-lg border border-primary-foreground/10 shadow-md transition-all duration-200 hover:bg-primary/90 active:scale-[0.97] inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isNavigatingToLogin ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isNavigatingToLogin ? "Opening Login..." : "Secure Biometric Login"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
