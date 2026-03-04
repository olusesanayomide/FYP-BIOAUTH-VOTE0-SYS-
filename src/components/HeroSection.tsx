"use client";

import { motion } from "framer-motion";
import { BarChart3, Check, ChevronRight, Clock3, Fingerprint, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const HeroSection = () => {
  const [targetDate] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() + 5);
    t.setHours(t.getHours() + 11);
    t.setMinutes(t.getMinutes() + 45);
    return t;
  });

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section id="home" className="relative min-h-[88vh] flex items-center overflow-hidden bg-gradient-to-b from-background via-background to-background dark:from-[#060b1a] dark:via-[#071633] dark:to-[#060b1a]">
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] rounded-full bg-primary/10 dark:bg-[#3b82f6]/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[320px] h-[320px] rounded-full bg-accent/10 dark:bg-[#2563eb]/20 blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-24 md:py-28">
        <div className="mb-10 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] max-w-[22ch]">
            {"Your Vote, Secured by Your Identity".split(" ").map((word, i) => (
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
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
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
              className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-8"
            >
              A modern digital voting platform where biometric identity, transparent analytics, and encrypted ballots create trust at scale.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="flex flex-wrap gap-3"
            >
              <button className="gradient-cta text-primary-foreground font-semibold px-7 py-3 rounded-xl transition-all duration-300 hover:scale-[1.02] glow-cta text-sm inline-flex items-center gap-2">
                Secure Biometric Login
                <ChevronRight className="w-4 h-4" />
              </button>
              <button className="border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 font-medium px-7 py-3 rounded-xl transition-all duration-300 text-sm">
                Explore Election Flow
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="grid grid-cols-2 gap-4 max-w-[520px] ml-auto">
              <div className="col-span-1 row-span-2 rounded-2xl border border-border/70 dark:border-blue-400/20 bg-card/75 dark:bg-white/[0.04] backdrop-blur-xl p-5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Biometric Seal</p>
                <div className="relative w-40 h-40 mx-auto mt-2">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 blur-[2px]" />
                  <div className="absolute inset-3 rounded-full border border-primary/40" />
                  <div className="absolute inset-6 rounded-full border border-primary/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Fingerprint className="w-16 h-16 text-primary drop-shadow-[0_6px_16px_rgba(59,130,246,0.35)]" />
                  </div>
                </div>
                <div className="mt-5 text-center">
                  <p className="text-sm font-semibold text-foreground">3D Fingerprint Identity</p>
                  <p className="text-xs text-muted-foreground mt-1">One person. One vote.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 dark:border-blue-400/20 bg-card/75 dark:bg-white/[0.04] backdrop-blur-xl p-4">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  <Clock3 className="w-4 h-4 text-primary" />
                  <span className="text-xs uppercase tracking-widest">Live Countdown</span>
                </div>
                <p className="text-2xl font-bold text-foreground leading-none">
                  {pad(countdown.days)}:{pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">Next election window</p>
              </div>

              <div className="rounded-2xl border border-border/70 dark:border-blue-400/20 bg-card/75 dark:bg-white/[0.04] backdrop-blur-xl p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Secure Access</p>
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  Biometric Login
                </button>
              </div>

              <div className="col-span-2 rounded-2xl border border-border/70 dark:border-blue-400/20 bg-card/75 dark:bg-white/[0.04] backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Real-Time Voting Analytics</p>
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <div className="grid grid-cols-6 gap-2 items-end h-20">
                  {[34, 52, 41, 67, 58, 81].map((v, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${v}%` }}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                      className="rounded-md bg-gradient-to-t from-primary to-blue-400/70"
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  +12.4% turnout in the last hour
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
