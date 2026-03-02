"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, ScanFace, Check, X } from "lucide-react";

const LiveDemo = () => {
  const [demoOpen, setDemoOpen] = useState(false);
  const [step, setStep] = useState(0);

  const openDemo = () => {
    setDemoOpen(true);
    setStep(0);
    // Animate through steps
    setTimeout(() => setStep(1), 1200);
    setTimeout(() => setStep(2), 2800);
    setTimeout(() => setStep(3), 4200);
  };

  return (
    <section className="section-spacing section-padding">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card p-10 md:p-16 text-center relative overflow-hidden"
        >
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

          <h2 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">
            Experience the Future of Voting
          </h2>
          <p className="text-muted-foreground mb-8 relative z-10">
            See how biometric verification works in real-time.
          </p>
          <button
            onClick={openDemo}
            className="gradient-cta text-primary-foreground font-semibold px-8 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.03] glow-cta text-sm relative z-10"
          >
            Launch Interactive Demo
          </button>
        </motion.div>
      </div>

      {/* Demo Modal */}
      <AnimatePresence>
        {demoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-6"
            onClick={() => setDemoOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-8 md:p-12 w-full max-w-md relative"
            >
              <button
                onClick={() => setDemoOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center gap-6 min-h-[280px] justify-center">
                {step === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 rounded-full border-2 border-primary/30 flex items-center justify-center pulse-glow">
                      <ScanFace className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Initializing face scan...</p>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 rounded-full border-2 border-primary/50 flex items-center justify-center relative overflow-hidden">
                      <ScanFace className="w-10 h-10 text-primary" />
                      <div className="scan-line absolute left-0 right-0 h-0.5 bg-primary/60" />
                    </div>
                    <p className="text-sm text-muted-foreground">Scanning biometrics...</p>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 rounded-full border-2 border-accent/50 flex items-center justify-center pulse-glow">
                      <Fingerprint className="w-10 h-10 text-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground">Verifying fingerprint...</p>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                      <Check className="w-10 h-10 text-accent" />
                    </div>
                    <p className="text-base font-semibold text-accent">Verification Successful</p>
                    <p className="text-xs text-muted-foreground">Identity confirmed. You may now cast your vote.</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default LiveDemo;
