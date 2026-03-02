"use client";

import { motion } from "framer-motion";
import { UserCheck, ScanFace, ShieldCheck, Database } from "lucide-react";

const steps = [
  {
    icon: UserCheck,
    title: "Register & Identity Validation",
    description: "Users enroll with biometric credentials.",
  },
  {
    icon: ScanFace,
    title: "Biometric Authentication",
    description: "Face ID / Fingerprint via secure WebAuthn.",
  },
  {
    icon: ShieldCheck,
    title: "Encrypted Ballot Submission",
    description: "Vote encrypted before leaving device.",
  },
  {
    icon: Database,
    title: "Tamper-Proof Storage",
    description: "Immutable storage with audit logs.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="section-spacing section-padding">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple. Secure. Seamless.
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Four steps to a verified, tamper-proof election.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-6 md:p-8 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary/60 tracking-widest uppercase mb-3 block">
                Step {i + 1}
              </span>
              <h3 className="text-base font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
