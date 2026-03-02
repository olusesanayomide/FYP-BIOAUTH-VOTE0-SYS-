"use client";

import { motion } from "framer-motion";
import { ShieldOff, UserX, BarChart3, Globe, ClipboardCheck, Smartphone } from "lucide-react";

const benefits = [
  { icon: ShieldOff, title: "Eliminates Voter Fraud", desc: "Biometric verification ensures each vote is legitimate." },
  { icon: UserX, title: "Prevents Multiple Voting", desc: "One identity, one vote — no exceptions." },
  { icon: BarChart3, title: "Real-Time Results Dashboard", desc: "Live tallying with instant visual reports." },
  { icon: Globe, title: "Remote Yet Verified Participation", desc: "Vote securely from anywhere in the world." },
  { icon: ClipboardCheck, title: "Fully Auditable Elections", desc: "Complete transparency with immutable records." },
  { icon: Smartphone, title: "Cross-Device Secure Access", desc: "Works on mobile, tablet, and desktop." },
];

const BenefitsGrid = () => {
  return (
    <section id="benefits" className="section-spacing section-padding gradient-section">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 md:mb-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Organizations Choose SecureVote
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Trusted infrastructure for verified digital elections.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass-card p-6 md:p-8 group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsGrid;
