"use client";

import { motion } from "framer-motion";
import { Check, Lock, ScanFace, ShieldAlert, Blocks, Activity } from "lucide-react";

const features = [
  { icon: Lock, label: "End-to-End Encryption (AES-256)" },
  { icon: ScanFace, label: "WebAuthn Biometric Protocol" },
  { icon: ShieldAlert, label: "Anti-Duplicate Vote Detection" },
  { icon: Blocks, label: "Blockchain-backed Audit Trail" },
  { icon: Activity, label: "Real-time Monitoring System" },
];

const SecuritySection = () => {
  return (
    <section id="security" className="section-spacing section-padding relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 blur-[150px] rounded-full -translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left - Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-accent/40" />
                <div className="w-3 h-3 rounded-full bg-primary/40" />
              </div>
              {/* Mock dashboard */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-xs text-muted-foreground">Election Status</span>
                  <span className="text-xs font-medium text-accent flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" /> Live
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Voters", value: "12,847" },
                    { label: "Verified", value: "12,841" },
                    { label: "Flagged", value: "0" },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 rounded-lg bg-muted/20 text-center">
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[85, 62, 48].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20">
                        {["Candidate A", "Candidate B", "Candidate C"][i]}
                      </span>
                      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: i === 0
                              ? "hsl(var(--primary))"
                              : i === 1
                              ? "hsl(var(--accent))"
                              : "hsl(var(--muted-foreground))",
                          }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${w}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8">{w}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Content */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold mb-8"
            >
              Built With Military-Grade Security
            </motion.h2>

            <div className="space-y-5">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-sm text-muted-foreground">{f.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;
