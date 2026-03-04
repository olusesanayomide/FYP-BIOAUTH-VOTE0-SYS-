"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const CTASection = () => {
  const router = useRouter();
  const [isNavigatingToLogin, setIsNavigatingToLogin] = useState(false);

  const handleLoginClick = () => {
    if (isNavigatingToLogin) return;
    setIsNavigatingToLogin(true);
    router.push("/login");
  };

  return (
    <section className="section-spacing section-padding relative overflow-hidden">
      <div className="absolute inset-0 gradient-cta-section pointer-events-none" />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl font-bold mb-3"
        >
          Ready to Conduct a Secure Election?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
        >
          Deploy in minutes. Scale to thousands.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={handleLoginClick}
            disabled={isNavigatingToLogin}
            className="gradient-cta text-primary-foreground font-semibold px-8 py-3.5 rounded-xl transition-all duration-300 hover:scale-[1.02] glow-cta text-sm md:text-base inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isNavigatingToLogin ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isNavigatingToLogin ? "Opening Login..." : "Proceed to Login"}
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
