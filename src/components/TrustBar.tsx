"use client";

import { motion } from "framer-motion";

const logos = [
  "Federal University System",
  "National Youth Council",
  "CivicTech Alliance",
  "Student Union Congress",
];

const TrustBar = () => {
  return (
    <section className="relative border-y border-border/40 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 py-10 md:py-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-xs font-medium text-muted-foreground tracking-widest uppercase mb-8"
        >
          Trusted by 120+ Universities and Organizations
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {logos.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group cursor-default"
            >
              <span className="text-sm font-semibold text-muted-foreground/50 tracking-wide transition-colors duration-500 group-hover:text-muted-foreground">
                {name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
