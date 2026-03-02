"use client";

import { motion } from "framer-motion";
import { Shield, Check, Fingerprint, Lock, ScanFace } from "lucide-react";

const HeroSection = () => {
  const headlineWords = "Secure. Transparent. Biometrically Verified Voting.".split(" ");

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-pattern" />
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-32 md:py-40">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left - Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/80 bg-card/40 backdrop-blur-sm mb-8"
            >
              <Lock className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                End-to-End Encrypted
              </span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
              {headlineWords.map((word, i) => (
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

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-10"
            >
              Next-generation biometric authentication ensures one person, one vote — fully encrypted and fraud-proof.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="flex flex-wrap gap-4"
            >
              <button className="gradient-cta text-primary-foreground font-semibold px-8 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.03] glow-cta text-sm">
                Verify & Vote Now
              </button>
              <button className="border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 font-medium px-8 py-3.5 rounded-xl transition-all duration-300 text-sm">
                Learn How It Works
              </button>
            </motion.div>
          </div>

          {/* Right - Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:flex items-center justify-center"
          >
            <div className="relative w-full max-w-md mx-auto">
              {/* Main card */}
              <div className="glass-card p-8 relative overflow-hidden">
                {/* Scan animation */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <div className="scan-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-2 border-primary/30 flex items-center justify-center pulse-glow">
                      <Fingerprint className="w-12 h-12 text-primary" />
                    </div>
                    <div className="absolute -inset-4 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">Biometric Verification</p>
                    <p className="text-xs text-muted-foreground mt-1">Place your finger to authenticate</p>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full gradient-cta rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 2, delay: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <motion.div
                className="absolute -top-6 -right-6 glass-card px-4 py-3 float-animation"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-foreground">Identity Verified</span>
                </div>
              </motion.div>

              <motion.div
                className="absolute -bottom-4 -left-6 glass-card px-4 py-3 float-animation"
                style={{ animationDelay: "1.5s" }}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">AES-256 Encrypted</span>
                </div>
              </motion.div>

              <motion.div
                className="absolute top-1/2 -right-10 glass-card px-4 py-3 float-animation"
                style={{ animationDelay: "2.5s" }}
              >
                <div className="flex items-center gap-2">
                  <ScanFace className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium text-foreground">Face ID Ready</span>
                </div>
              </motion.div>

              {/* Background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/8 rounded-full blur-[80px] -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
