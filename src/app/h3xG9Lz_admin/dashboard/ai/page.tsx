"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Brain, TrendingUp, AlertTriangle, Activity, Lightbulb } from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { getAuditLogs } from "@/services/adminService";
import apiClient from "@/services/api";

interface ElectionLike {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  registeredVoters?: number;
  votesCast?: number;
  verifiedBiometric?: number;
  fraudAlerts?: number;
  scope_faculty?: string;
  scope_department?: string;
  scope_level?: number;
}

interface AuditLogLike {
  id: string;
  action: string;
  status?: string;
  created_at: string;
  ip_address?: string;
}

const pct = (n: number) => `${Math.max(0, Math.min(100, Math.round(n)))}%`;

const AIInsightsPage = () => {
  const [elections, setElections] = useState<ElectionLike[]>([]);
  const [logs, setLogs] = useState<AuditLogLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [electionsRes, logsRes] = await Promise.all([
          apiClient.get('/admin/elections'),
          getAuditLogs(),
        ]);

        const electionsJson = electionsRes.data;
        if (electionsJson.success) {
          setElections(electionsJson.data || []);
        }

        if (logsRes.success && logsRes.data) {
          setLogs(logsRes.data as AuditLogLike[]);
        } else if (!logsRes.success) {
          setError(logsRes.error || "Failed to fetch AI insight telemetry.");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to fetch AI insight telemetry.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const analytics = useMemo(() => {
    const now = Date.now();
    const ongoing = elections.filter((e) => {
      const start = new Date(e.start_time).getTime();
      const end = new Date(e.end_time).getTime();
      return e.status !== "suspended" && now >= start && now <= end;
    });

    const failures24h = logs.filter((l) => {
      const within24h = now - new Date(l.created_at).getTime() <= 24 * 60 * 60 * 1000;
      const failed = (l.status || "").toUpperCase() === "FAILURE" || l.action.includes("FAIL");
      return within24h && failed;
    }).length;

    const suspiciousIpCount = new Set(
      logs
        .filter((l) => (l.status || "").toUpperCase() === "FAILURE")
        .map((l) => l.ip_address)
        .filter(Boolean),
    ).size;

    const forecasts = ongoing.map((e) => {
      const start = new Date(e.start_time).getTime();
      const end = new Date(e.end_time).getTime();
      const elapsed = Math.max(0, now - start);
      const duration = Math.max(1, end - start);
      const progress = elapsed / duration;
      const turnout = (e.votesCast || 0) / Math.max(1, e.registeredVoters || 0);
      const projectedTurnout = progress > 0 ? Math.min(1, turnout / progress) : turnout;
      const confidence = progress > 0.5 ? "High" : progress > 0.25 ? "Medium" : "Low";
      const risk = projectedTurnout < 0.25 ? "High" : projectedTurnout < 0.45 ? "Medium" : "Low";

      return {
        id: e.id,
        title: e.title,
        scope: e.scope_department || e.scope_faculty || "University-Wide",
        progressPct: pct(progress * 100),
        currentTurnoutPct: pct(turnout * 100),
        projectedTurnoutPct: pct(projectedTurnout * 100),
        confidence,
        risk,
      };
    });

    const highRisk = forecasts.filter((f) => f.risk === "High").length;
    const mediumRisk = forecasts.filter((f) => f.risk === "Medium").length;

    const recommendations: string[] = [];
    if (highRisk > 0) {
      recommendations.push(
        `Run targeted reminders for ${highRisk} high-risk ongoing election(s) with projected turnout below 25%.`,
      );
    }
    if (mediumRisk > 0) {
      recommendations.push(
        `Monitor ${mediumRisk} medium-risk election(s) and push department/faculty announcements within peak engagement hours.`,
      );
    }
    if (failures24h >= 10) {
      recommendations.push(
        `Investigate elevated auth failures (${failures24h} in 24h). Review suspicious IPs and verify OTP/WebAuthn reliability.`,
      );
    }
    if (suspiciousIpCount >= 3) {
      recommendations.push(
        `Security signal: ${suspiciousIpCount} IP(s) generated failed events. Correlate with Audit Trail before enforcement action.`,
      );
    }
    if (recommendations.length === 0) {
      recommendations.push("No urgent intervention detected. Continue routine monitoring and daily summary checks.");
    }

    return {
      ongoingCount: ongoing.length,
      highRisk,
      mediumRisk,
      failures24h,
      suspiciousIpCount,
      forecasts,
      recommendations,
    };
  }, [elections, logs]);

  return (
    <DashboardLayout breadcrumb={["AI Insights"]}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">AI Insights (v1)</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Ongoing Elections", value: analytics.ongoingCount, color: "text-foreground" },
            { label: "High Risk Elections", value: analytics.highRisk, color: "text-destructive" },
            { label: "Medium Risk Elections", value: analytics.mediumRisk, color: "text-warning" },
            { label: "Auth Failures (24h)", value: analytics.failures24h, color: "text-primary" },
            { label: "Suspicious IPs", value: analytics.suspiciousIpCount, color: "text-foreground" },
          ].map((m) => (
            <div key={m.label} className="glass-card rounded-xl p-4">
              <p className={`text-2xl font-semibold ${m.color}`}>{loading ? "..." : m.value}</p>
              <p className="text-[10px] text-muted-foreground tracking-wider mt-1 uppercase">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="glass-card rounded-xl p-5 xl:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Turnout Forecast (Rule-Based)</h3>
            </div>

            {loading ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-4">{error}</p>
            ) : analytics.forecasts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No ongoing elections to forecast right now.</p>
            ) : (
              <div className="space-y-3">
                {analytics.forecasts.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border/30 bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Scope: {f.scope}</p>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${f.risk === "High"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : f.risk === "Medium"
                              ? "bg-warning/10 text-warning border border-warning/20"
                              : "bg-success/10 text-success border border-success/20"
                          }`}
                      >
                        {f.risk} Risk
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Progress</p>
                        <p className="text-foreground font-medium">{f.progressPct}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Current Turnout</p>
                        <p className="text-foreground font-medium">{f.currentTurnoutPct}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Projected Turnout</p>
                        <p className="text-foreground font-medium">{f.projectedTurnoutPct}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="text-foreground font-medium">{f.confidence}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Recommended Actions</h3>
              </div>
              <div className="space-y-3">
                {analytics.recommendations.map((r, idx) => (
                  <div key={idx} className="rounded-lg border border-border/30 bg-muted/20 px-3 py-2.5">
                    <p className="text-xs text-foreground leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Anomaly Signals</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failure pressure</span>
                  <span className={analytics.failures24h >= 10 ? "text-destructive" : "text-success"}>
                    {analytics.failures24h >= 10 ? "Elevated" : "Normal"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IP anomaly</span>
                  <span className={analytics.suspiciousIpCount >= 3 ? "text-warning" : "text-success"}>
                    {analytics.suspiciousIpCount >= 3 ? "Watchlist" : "Clear"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Turnout trajectory</span>
                  <span className={analytics.highRisk > 0 ? "text-destructive" : "text-success"}>
                    {analytics.highRisk > 0 ? "Needs intervention" : "On track"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-warning/10">
          <p className="text-[10px] text-warning/80 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            v1 uses deterministic analytics heuristics. This is decision support, not autonomous enforcement.
          </p>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default AIInsightsPage;
