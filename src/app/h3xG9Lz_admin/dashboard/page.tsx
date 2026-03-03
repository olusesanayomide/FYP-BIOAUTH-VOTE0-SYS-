"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Fingerprint, ShieldAlert, TrendingUp, Activity, Clock, CheckCircle2,
  AlertTriangle, Ban
} from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import Cookies from "js-cookie";

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span>{count.toLocaleString()}</span>;
}

const Dashboard = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [stats, setStats] = useState({
    adminsOnline: 0,
    totalVoters: 0,
    verifiedBio: 0,
    elections: [] as any[],
    recentActions: [] as any[]
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const token = Cookies.get("admin_token");
        const headers: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
        const response = await fetch(`${apiUrl}/admin/stats`, { headers });
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const statusGlow = (s: string) =>
    s === "ongoing" ? "glow-cyan" : s === "upcoming" ? "glow-amber" : "glow-emerald";
  const statusBorder = (s: string) =>
    s === "ongoing" ? "border-primary/20" : s === "upcoming" ? "border-warning/20" : "border-success/20";
  const statusColor = (s: string) =>
    s === "ongoing" ? "text-primary" : s === "upcoming" ? "text-warning" : "text-success";
  const statusBg = (s: string) =>
    s === "ongoing" ? "bg-primary/10" : s === "upcoming" ? "bg-warning/10" : "bg-success/10";
  const progressBg = (s: string) =>
    s === "ongoing" ? "bg-primary" : s === "upcoming" ? "bg-warning" : "bg-success";

  return (
    <DashboardLayout breadcrumb={["Dashboard"]}>
      {/* Hero */}
      <motion.div
        className="admin-card rounded-2xl p-8 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -inset-full h-full w-1/3 animate-light-sweep" style={{ background: "linear-gradient(90deg, transparent, hsla(187, 100%, 50%, 0.02), transparent)" }} />
        </div>
        <div className="absolute top-0 left-8 right-8 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(187, 100%, 50%, 0.1), transparent)" }} />
        <motion.h2 className="text-2xl font-semibold text-foreground tracking-tight mb-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          Command Center Overview
        </motion.h2>
        <motion.p className="text-sm text-muted-foreground max-w-xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          Monitor biometric authentication, election activity, and system integrity in real time.
        </motion.p>
        <div className="flex items-center gap-6 mt-6">
          <div className="text-center">
            <p className="text-2xl font-semibold text-primary">
              {!isLoadingStats ? <AnimatedCounter target={stats.adminsOnline} duration={800} /> : "-"}
            </p>
            <p className="admin-kpi mt-1">ADMINS ONLINE</p>
          </div>
          <div className="w-px h-10 bg-border/30" />
          <div className="text-center">
            <p className="text-2xl font-semibold text-foreground">
              {!isLoadingStats ? <AnimatedCounter target={stats.totalVoters} /> : "-"}
            </p>
            <p className="admin-kpi mt-1">TOTAL VOTERS</p>
          </div>
          <div className="w-px h-10 bg-border/30" />
          <div className="text-center">
            <p className="text-2xl font-semibold text-success">
              {!isLoadingStats ? <AnimatedCounter target={stats.verifiedBio} /> : "-"}
            </p>
            <p className="admin-kpi mt-1">VERIFIED BIO</p>
          </div>
        </div>
      </motion.div>

      {/* Election cards */}
      <div>
        <h3 className="admin-section-title mb-4 mt-8">Election Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {stats.elections?.length > 0 ? stats.elections.map((el, i) => (
            <motion.div
              key={i}
              className={`admin-card rounded-xl p-6 cursor-pointer transition-all duration-300 border ${statusBorder(el.status)} ${hoveredCard === i ? statusGlow(el.status) : ""}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              whileHover={{ y: -4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full ${statusBg(el.status)} ${statusColor(el.status)}`}>
                  {el.status}
                </span>
                {el.status === "ongoing" && <Activity className="w-4 h-4 text-primary animate-pulse" />}
                {el.status === "upcoming" && <Clock className="w-4 h-4 text-warning" />}
                {el.status === "completed" && <CheckCircle2 className="w-4 h-4 text-success" />}
              </div>
              <h4 className="text-sm font-medium text-foreground mb-3 truncate">{el.name}</h4>
              <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                <p>Start: {el.start} • End: {el.end}</p>
                <p>Available Voters: <span className="text-foreground">{el.voters}</span> • Actual Votes: <span className="text-foreground">{el.verified}</span></p>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${progressBg(el.status)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${el.progress}%` }}
                  transition={{ duration: 1.5, delay: 0.6 + i * 0.1, ease: "easeOut" }}
                  style={{ boxShadow: `0 0 8px ${el.status === "ongoing" ? "hsla(187,100%,50%,0.4)" : el.status === "upcoming" ? "hsla(38,100%,56%,0.4)" : "hsla(153,100%,50%,0.4)"}` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{el.progress}% complete</p>
            </motion.div>
          )) : (
            <div className="p-10 col-span-full border border-dashed border-border/50 rounded-2xl flex justify-center text-muted-foreground text-sm">No Active Elections Configured</div>
          )}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Biometric module */}
        <motion.div className="admin-card rounded-xl p-6 lg:col-span-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <div className="flex items-center gap-2 mb-4">
            <Fingerprint className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Biometric Verification Stream</h3>
          </div>
          <div className="relative w-20 h-20 mx-auto my-6">
            <Fingerprint className="w-20 h-20 text-primary/20" />
            <motion.div
              className="absolute inset-0 flex items-center"
              style={{ background: "linear-gradient(transparent 40%, hsla(187, 100%, 50%, 0.15) 50%, transparent 60%)" }}
              animate={{ y: [-30, 30, -30] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Live Verifications Today</span>
              <span className="text-primary font-medium"><AnimatedCounter target={2845} /></span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Failed Attempts</span>
              <span className="text-destructive font-medium"><AnimatedCounter target={12} duration={800} /></span>
            </div>
          </div>
        </motion.div>

        {/* Security center */}
        <motion.div className="admin-card rounded-xl p-6 border border-destructive/5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-destructive/70" />
            <h3 className="text-sm font-medium text-foreground">Security Center</h3>
          </div>
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Threat Level</span>
              <span className="text-xs font-medium tracking-wider px-2.5 py-1 rounded-full bg-success/10 text-success">LOW</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Suspicious Attempts</span>
              <span className="text-sm font-medium text-warning"><AnimatedCounter target={3} duration={800} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">IP Flagged</span>
              <span className="text-sm font-medium text-destructive"><AnimatedCounter target={1} duration={500} /></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Encryption</span>
              <span className="text-xs text-muted-foreground">AES-256</span>
            </div>
          </div>
        </motion.div>

        {/* Recent actions */}
        <motion.div className="admin-card rounded-xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary/60" />
            <h3 className="text-sm font-medium text-foreground">Recent Admin Actions</h3>
          </div>
          <div className="relative space-y-0 mt-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/30" />
            {stats.recentActions?.length > 0 ? stats.recentActions.map((action, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 py-2.5 relative"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
              >
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/40 bg-background flex-shrink-0 mt-0.5 relative z-10" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/80 truncate">{action.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{action.time}</p>
                </div>
              </motion.div>
            )) : (
              <div className="flex justify-center p-4 text-xs text-muted-foreground">No recent actions found.</div>
            )}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

