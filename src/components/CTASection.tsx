"use client";

import { motion } from "framer-motion";

const CTASection = () => {
  return (
    <section className="section-spacing section-padding relative overflow-hidden">
      <div className="absolute inset-0 gradient-cta-section pointer-events-none" />
      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-5xl font-bold mb-4"
        >
          Ready to Conduct a Secure Election?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-lg text-muted-foreground mb-10"
        >
          Deploy in minutes. Scale to thousands.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button className="gradient-cta text-primary-foreground font-semibold px-10 py-4 rounded-xl transition-all duration-300 hover:scale-[1.03] glow-cta text-base">
            Start Secure Election
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
