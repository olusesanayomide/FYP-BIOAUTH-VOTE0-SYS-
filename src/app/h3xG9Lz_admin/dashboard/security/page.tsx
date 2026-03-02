"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fingerprint,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { getAuditLogs } from "@/services/adminService";

interface AuditLog {
  id: string;
  action: string;
  status?: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
  admin_name?: string;
}

type Severity = "low" | "medium" | "high";

interface SecurityIncident {
  id: string;
  title: string;
  severity: Severity;
  reason: string;
  count: number;
  latestAt: string;
  actor: string;
  sourceIp: string;
}

const FAILURE_ACTION_HINTS = [
  "FAILURE",
  "INVALID",
  "OTP_EXPIRED",
  "MAX_ATTEMPTS",
  "DOUBLE_VOTE",
  "SUSPENDED",
];

const BIOMETRIC_ACTION_KEYS = ["WEBAUTHN", "BIOMETRIC"];

const isFailureLike = (log: AuditLog) => {
  const status = (log.status || "").toUpperCase();
  if (status === "FAILURE") return true;
  const action = (log.action || "").toUpperCase();
  return FAILURE_ACTION_HINTS.some((k) => action.includes(k));
};

const isBiometricAction = (action: string) => {
  const a = action.toUpperCase();
  return BIOMETRIC_ACTION_KEYS.some((k) => a.includes(k));
};

const SecurityCenterPage = () => {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const resp = await getAuditLogs();
        if (!resp.success || !resp.data) {
          setError(resp.error || "Failed to load security telemetry");
          return;
        }
        setLogs(resp.data as AuditLog[]);
      } catch (e: any) {
        setError(e?.message || "Failed to load security telemetry");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const metrics = useMemo(() => {
    const now = Date.now();
    const logs24h = logs.filter((l) => now - new Date(l.created_at).getTime() <= 24 * 60 * 60 * 1000);
    const logs7d = logs.filter((l) => now - new Date(l.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000);

    const failed24h = logs24h.filter(isFailureLike).length;
    const failed7d = logs7d.filter(isFailureLike).length;
    const biometricFailures7d = logs7d.filter(
      (l) => isBiometricAction(l.action) && isFailureLike(l),
    ).length;

    const ipFailureCounts = new Map<string, number>();
    logs7d.filter(isFailureLike).forEach((l) => {
      const ip = l.ip_address || "unknown";
      ipFailureCounts.set(ip, (ipFailureCounts.get(ip) || 0) + 1);
    });
    const flaggedIps = Array.from(ipFailureCounts.values()).filter((count) => count >= 3).length;

    const highRiskUsers = new Set(
      logs7d
        .filter(isFailureLike)
        .map((l) => l.resource_id)
        .filter((id): id is string => Boolean(id)),
    ).size;

    const threatLevel: "LOW" | "MEDIUM" | "HIGH" =
      failed24h >= 30 || flaggedIps >= 5 ? "HIGH" : failed24h >= 10 || flaggedIps >= 2 ? "MEDIUM" : "LOW";

    return {
      failed24h,
      failed7d,
      biometricFailures7d,
      flaggedIps,
      highRiskUsers,
      threatLevel,
      logs7d,
    };
  }, [logs]);

  const incidents = useMemo<SecurityIncident[]>(() => {
    const grouped = new Map<string, SecurityIncident>();
    const failed = metrics.logs7d.filter(isFailureLike);

    failed.forEach((l) => {
      const sourceIp = l.ip_address || "unknown";
      const actor = l.resource_id || "unknown";
      const key = `${sourceIp}:${actor}:${l.action}`;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          id: key,
          title: l.action.replace(/_/g, " "),
          severity: "low",
          reason: "Repeated failure pattern",
          count: 1,
          latestAt: l.created_at,
          actor,
          sourceIp,
        });
      } else {
        current.count += 1;
        if (new Date(l.created_at) > new Date(current.latestAt)) current.latestAt = l.created_at;
      }
    });

    const scored = Array.from(grouped.values()).map((i) => {
      const severity: Severity = i.count >= 5 ? "high" : i.count >= 3 ? "medium" : "low";
      return {
        ...i,
        severity,
        reason:
          severity === "high"
            ? "Frequent repeated failures from same source"
            : severity === "medium"
              ? "Multiple failures require review"
              : "Single/low-volume failure pattern",
      };
    });

    return scored.sort((a, b) => b.count - a.count).slice(0, 12);
  }, [metrics.logs7d]);

  const severityStyle = (severity: Severity) => {
    if (severity === "high") return "text-destructive bg-destructive/10 border-destructive/20";
    if (severity === "medium") return "text-warning bg-warning/10 border-warning/20";
    return "text-success bg-success/10 border-success/20";
  };

  return (
    <DashboardLayout breadcrumb={["Security Center"]}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Security Center</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Threat Level</p>
            <p
              className={`text-2xl font-semibold mt-1 ${metrics.threatLevel === "HIGH" ? "text-destructive" : metrics.threatLevel === "MEDIUM" ? "text-warning" : "text-success"}`}
            >
              {isLoading ? "..." : metrics.threatLevel}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Failed (24h)</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">{isLoading ? "..." : metrics.failed24h}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Failed (7d)</p>
            <p className="text-2xl font-semibold mt-1 text-warning">{isLoading ? "..." : metrics.failed7d}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Biometric Failures (7d)</p>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {isLoading ? "..." : metrics.biometricFailures7d}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Flagged IPs</p>
            <p className="text-2xl font-semibold mt-1 text-foreground">{isLoading ? "..." : metrics.flaggedIps}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="glass-card rounded-xl p-5 xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Incident Queue (Derived)</h3>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                Last 7 Days
              </span>
            </div>

            {isLoading ? (
              <div className="py-10 flex justify-center">
                <div className="w-6 h-6 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-6">{error}</p>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No suspicious incidents detected from current logs.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-lg border border-border/30 bg-muted/20 px-4 py-3 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{incident.title}</p>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${severityStyle(
                            incident.severity,
                          )}`}
                        >
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{incident.reason}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Source IP: {incident.sourceIp} | Actor: {incident.actor}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{incident.count} events</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(incident.latestAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Response Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/h3xG9Lz_admin/dashboard/voters")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground hover:bg-muted/50 transition-all"
                >
                  Review Voter Accounts
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => router.push("/h3xG9Lz_admin/dashboard/biometrics")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground hover:bg-muted/50 transition-all"
                >
                  Inspect Biometric Logs
                  <Fingerprint className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => router.push("/h3xG9Lz_admin/dashboard/audit")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground hover:bg-muted/50 transition-all"
                >
                  Open Full Audit Trail
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Policy Signals</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">High-risk actors</span>
                  <span className="text-foreground">{isLoading ? "..." : metrics.highRiskUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incident rows</span>
                  <span className="text-foreground">{isLoading ? "..." : incidents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Critical incidents</span>
                  <span className="text-destructive">
                    {isLoading ? "..." : incidents.filter((i) => i.severity === "high").length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-warning/10">
          <p className="text-[10px] text-warning/80 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Incident queue is derived from audit telemetry and does not replace a dedicated SIEM workflow.
          </p>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default SecurityCenterPage;

