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
import {
  AuditLogTelemetryRow,
  deriveSecurityTelemetry,
  SecurityIncidentSeverity,
} from "@/lib/adminSecurityTelemetry";

const SecurityCenterPage = () => {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogTelemetryRow[]>([]);
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
        setLogs(resp.data as AuditLogTelemetryRow[]);
      } catch (e: any) {
        setError(e?.message || "Failed to load security telemetry");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const telemetry = useMemo(() => deriveSecurityTelemetry(logs), [logs]);

  const severityStyle = (severity: SecurityIncidentSeverity) => {
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
              className={`text-2xl font-semibold mt-1 ${telemetry.threatLevel === "HIGH" ? "text-destructive" : telemetry.threatLevel === "MEDIUM" ? "text-warning" : "text-success"}`}
            >
              {isLoading ? "..." : telemetry.threatLevel}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Failed (24h)</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">{isLoading ? "..." : telemetry.failed24h}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Failed (7d)</p>
            <p className="text-2xl font-semibold mt-1 text-warning">{isLoading ? "..." : telemetry.failed7d}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Biometric Failures (7d)</p>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {isLoading ? "..." : telemetry.biometricFailures7d}
            </p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Flagged IPs</p>
            <p className="text-2xl font-semibold mt-1 text-foreground">{isLoading ? "..." : telemetry.flaggedIps}</p>
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
            ) : telemetry.incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No suspicious incidents detected from current logs.</p>
            ) : (
              <div className="space-y-3">
                {telemetry.incidents.map((incident) => (
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
                  <span className="text-foreground">{isLoading ? "..." : telemetry.highRiskUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Incident rows</span>
                  <span className="text-foreground">{isLoading ? "..." : telemetry.incidents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Critical incidents</span>
                  <span className="text-destructive">
                    {isLoading ? "..." : telemetry.incidents.filter((incident) => incident.severity === "high").length}
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
