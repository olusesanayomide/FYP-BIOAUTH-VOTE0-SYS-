"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { getAuditLogs } from "@/services/adminService";

type DateFilter = "all" | "24h" | "7d" | "30d";
type StatusFilter = "all" | "SUCCESS" | "FAILURE";

interface BiometricLog {
  id: string;
  action: string;
  status?: string;
  resource_id?: string;
  resource_type?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  admin_name?: string;
}

const BIOMETRIC_ACTIONS = [
  "WEBAUTHN_REGISTRATION_COMPLETE",
  "WEBAUTHN_VERIFICATION_SUCCESS",
  "WEBAUTHN_VERIFICATION_FAILURE",
  "WEBAUTHN_LOGIN_SUCCESS",
];

const isBiometricAction = (action: string) =>
  BIOMETRIC_ACTIONS.includes(action) ||
  action.includes("WEBAUTHN") ||
  action.includes("BIOMETRIC");

const parseDetails = (details: any) => {
  if (!details) return {};
  if (typeof details === "object") return details;
  if (typeof details === "string") {
    try {
      return JSON.parse(details);
    } catch {
      return { raw: details };
    }
  }
  return { raw: String(details) };
};

const BiometricLogsPage = () => {
  const [logs, setLogs] = useState<BiometricLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("7d");
  const [selectedLog, setSelectedLog] = useState<BiometricLog | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const resp = await getAuditLogs();
        if (!resp.success || !resp.data) {
          setError(resp.error || "Failed to load biometric logs");
          return;
        }
        setLogs((resp.data as BiometricLog[]).filter((l) => isBiometricAction(l.action)));
      } catch (e: any) {
        setError(e?.message || "Failed to load biometric logs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (dateFilter !== "all") {
      const now = Date.now();
      const hours = dateFilter === "24h" ? 24 : dateFilter === "7d" ? 24 * 7 : 24 * 30;
      const cutoff = now - hours * 60 * 60 * 1000;
      result = result.filter((l) => new Date(l.created_at).getTime() >= cutoff);
    }

    if (statusFilter !== "all") {
      result = result.filter((l) => (l.status || "").toUpperCase() === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        const details = parseDetails(l.details);
        const text = [
          l.action,
          l.resource_id,
          l.resource_type,
          l.admin_name,
          l.ip_address,
          details?.description,
          details?.name,
          details?.email,
          details?.raw,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }

    return result.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [logs, dateFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter((l) => (l.status || "").toUpperCase() === "SUCCESS").length;
    const failure = filteredLogs.filter((l) => (l.status || "").toUpperCase() === "FAILURE").length;
    const last24h = filteredLogs.filter(
      (l) => Date.now() - new Date(l.created_at).getTime() <= 24 * 60 * 60 * 1000,
    ).length;
    return { total, success, failure, last24h };
  }, [filteredLogs]);

  return (
    <DashboardLayout breadcrumb={["Biometric Logs"]}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Biometric Logs</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: stats.total, color: "text-foreground" },
            { label: "Success", value: stats.success, color: "text-success" },
            { label: "Failure", value: stats.failure, color: "text-destructive" },
            { label: "Last 24 Hours", value: stats.last24h, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-xl p-4">
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground tracking-wider mt-1 uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, users, admin, IP..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-10 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="h-10 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 appearance-none"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20">
                  {["Time", "Event", "Status", "Resource", "Admin", "IP", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[10px] text-muted-foreground tracking-wider uppercase font-medium"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-muted-foreground">
                      <div className="w-6 h-6 rounded-full border-t-2 border-r-2 border-primary animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-destructive text-sm">
                      {error}
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      No biometric log events found for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, i) => (
                    <motion.tr
                      key={log.id}
                      className="border-b border-border/10 hover:bg-muted/20 transition-colors"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-medium">{log.action}</td>
                      <td className="px-4 py-3">
                        {(log.status || "").toUpperCase() === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Success
                          </span>
                        ) : (log.status || "").toUpperCase() === "FAILURE" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="w-3.5 h-3.5" /> Failure
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" /> {log.status || "N/A"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.resource_id || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.admin_name || "System"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.ip_address || "—"}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-warning/10">
          <p className="text-[10px] text-warning/80 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Biometric logs show verification events and outcomes only. No biometric template data is exposed here.
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="glass-card w-full max-w-2xl p-6 border border-border/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Biometric Event Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  ["Time", new Date(selectedLog.created_at).toLocaleString()],
                  ["Action", selectedLog.action],
                  ["Status", selectedLog.status || "N/A"],
                  ["Resource ID", selectedLog.resource_id || "—"],
                  ["Resource Type", selectedLog.resource_type || "—"],
                  ["Admin", selectedLog.admin_name || "System"],
                  ["IP Address", selectedLog.ip_address || "—"],
                  ["User Agent", selectedLog.user_agent || "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground text-right break-all">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <p className="text-xs text-muted-foreground tracking-wide uppercase mb-2">Details</p>
                <pre className="max-h-64 overflow-auto rounded-lg bg-muted/30 p-3 text-[11px] text-foreground whitespace-pre-wrap break-words">
                  {JSON.stringify(parseDetails(selectedLog.details), null, 2)}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default BiometricLogsPage;

