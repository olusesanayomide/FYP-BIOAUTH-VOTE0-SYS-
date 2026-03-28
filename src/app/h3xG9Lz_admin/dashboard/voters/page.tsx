"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck, Search, Eye, X, Shield, AlertTriangle,
  Upload, RefreshCw, CheckCircle2, Clock, Smartphone, Trash2, Play, Pause
} from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import apiClient from "@/services/api";
import { isStoredSuperAdmin } from "@/lib/adminSession";

type BioStatus = "verified" | "not_enrolled" | "flagged";
type VoteStatus = "voted" | "not_voted";
type ViewMode = "list" | "profile";

interface Voter {
  id: string;
  name: string;
  matricNo: string;
  email: string;
  faculty: string;
  department: string;
  bioStatus: BioStatus;
  voteStatus: VoteStatus;
  device: string;
  lastLogin: string;
  riskLevel: "low" | "medium" | "high";
  bioEnrolledAt: string;
  deviceHash: string;
  status: "ACTIVE" | "SUSPENDED";
  loginHistory: { date: string; ip: string; device: string }[];
  suspiciousActivity: string[];
}

// Dynamic fetching prevents using hardcoded mocks

const bioStatusCfg: Record<BioStatus, { label: string; color: string; bg: string }> = {
  verified: { label: "Verified", color: "text-success", bg: "bg-success/10" },
  not_enrolled: { label: "Not Enrolled", color: "text-muted-foreground", bg: "bg-muted/30" },
  flagged: { label: "Flagged", color: "text-destructive", bg: "bg-destructive/10" },
};

const riskCfg: Record<string, { color: string; bg: string }> = {
  low: { color: "text-success", bg: "bg-success/10" },
  medium: { color: "text-warning", bg: "bg-warning/10" },
  high: { color: "text-destructive", bg: "bg-destructive/10" },
};

const formatDevice = (userAgent?: string | null): string => {
  if (!userAgent) return "-";

  const ua = userAgent.toLowerCase();

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if ((ua.includes("chrome/") || ua.includes("crios/")) && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("firefox/") || ua.includes("fxios/")) browser = "Firefox";
  else if (ua.includes("safari/") && !ua.includes("chrome/") && !ua.includes("crios/")) browser = "Safari";

  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os = "iOS";
  else if (ua.includes("macintosh") || ua.includes("mac os x")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  const mobile = ua.includes("mobile") || ua.includes("android") || ua.includes("iphone");
  return `${browser} on ${os}${mobile ? " (Mobile)" : ""}`;
};

const analyzeLoginPatterns = (loginHistory: { ip_address?: string | null; user_agent?: string | null }[]) => {
  const ipSet = new Set(loginHistory.map((l) => l.ip_address).filter(Boolean));
  const deviceSet = new Set(loginHistory.map((l) => formatDevice(l.user_agent)).filter((d) => d !== "-"));

  const suspiciousActivity: string[] = [];
  if (ipSet.size >= 3) suspiciousActivity.push("Multiple recent IP addresses detected.");
  if (deviceSet.size >= 3) suspiciousActivity.push("Frequent device switching detected.");

  let riskLevel: "low" | "medium" | "high" = "low";
  if (ipSet.size >= 3 || deviceSet.size >= 3) riskLevel = "high";
  else if (ipSet.size === 2 || deviceSet.size === 2) riskLevel = "medium";

  return { riskLevel, suspiciousActivity };
};

const Voters = () => {
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<Voter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBio, setFilterBio] = useState("all");
  const [filterVote, setFilterVote] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['csv', 'xlsx', 'xls'];

    if (!allowed.includes(ext || '')) {
      setImportError("Only CSV and Excel files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setShowImportModal(true);
  };

  const onImportConfirm = async (mode: 'overwrite' | 'add') => {
    if (!selectedFile) return;

    try {
      setImportLoading(true);
      setImportError(null);
      setImportSuccess(null);
      setShowImportModal(false);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', mode);

      const res = await apiClient.post('/admin/voters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;

      if (data.status === 'success') {
        setImportSuccess(data.message);
        fetchVoters(); // Refresh the list
      } else {
        setImportError(data.message || 'Import failed');
      }
    } catch (err: any) {
      console.error("Import error:", err);
      setImportError("An unexpected error occurred during import.");
    } finally {
      setImportLoading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [voters, setVoters] = useState<Voter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsSuperAdmin(isStoredSuperAdmin());
    fetchVoters();
  }, []);

  const fetchVoters = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/admin/voters');
      const data = res.data;
      if (data.success) {
        setVoters(data.data.map((u: any) => {
          const loginHistory = Array.isArray(u.login_history) ? u.login_history : [];
          const lastLoginValue = u.last_login_at || u.last_voted_at;
          const { riskLevel, suspiciousActivity } = analyzeLoginPatterns(loginHistory);

          return {
            id: u.id,
            name: u.name,
            matricNo: u.matric_no,
            email: u.email,
            faculty: u.faculty || '-',
            department: u.department || '-',
            bioStatus: u.registration_completed ? 'verified' : 'not_enrolled',
            voteStatus: u.has_voted ? 'voted' : 'not_voted',
            device: formatDevice(u.last_login_user_agent),
            lastLogin: lastLoginValue ? new Date(lastLoginValue).toLocaleString() : '-',
            riskLevel,
            bioEnrolledAt: u.registration_completed ? new Date(u.created_at).toLocaleString() : '-',
            deviceHash: u.last_login_ip || '-',
            status: u.status || 'ACTIVE',
            loginHistory: loginHistory.map((l: any) => ({
              date: l.created_at ? new Date(l.created_at).toLocaleString() : '-',
              ip: l.ip_address || '-',
              device: formatDevice(l.user_agent)
            })),
            suspiciousActivity
          };
        }));
      }
    } catch (err) {
      console.error("Failed to fetch voters", err);
    } finally {
      setIsLoading(false);
    }
  };

  const departments = Array.from(new Set(voters.map((v) => v.department)));
  const filtered = voters.filter((v) =>
    (searchQuery === "" || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.matricNo.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (filterBio === "all" || v.bioStatus === filterBio) &&
    (filterVote === "all" || v.voteStatus === filterVote) &&
    (filterDept === "all" || v.department === filterDept)
  );

  const stats = {
    total: voters.length,
    verified: voters.filter((v) => v.bioStatus === "verified").length,
    voted: voters.filter((v) => v.voteStatus === "voted").length,
    suspended: voters.filter((v) => v.status === "SUSPENDED").length,
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await apiClient.patch(`/admin/voters/${id}/status`, { status: newStatus });
      const data = res.data;
      if (data.success) {
        setVoters(prev => prev.map(v => v.id === id ? { ...v, status: newStatus as any } : v));
        if (selected?.id === id) {
          setSelected(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      }
    } catch (err) {
      console.error("Failed to update voter status", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isSuperAdmin) return;
    setDeleteTarget({ id, name });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiClient.delete(`/admin/voters/${deleteTarget.id}`);
      const data = res.data;
      if (data.success) {
        setVoters(prev => prev.filter(v => v.id !== deleteTarget.id));
        if (selected?.id === deleteTarget.id) {
          setView("list");
          setSelected(null);
        }
        setShowDeleteModal(false);
        setDeleteTarget(null);
      }
    } catch (err) {
      console.error("Failed to delete voter", err);
    }
  };

  return (
    <DashboardLayout breadcrumb={["Voter Registry"]}>
      <AnimatePresence mode="wait">
        {/* LIST */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="admin-card rounded-xl p-5 md:p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                <UserCheck className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Voter Registry</h2>
                    <p className="text-sm text-foreground/70 dark:text-muted-foreground mt-1">Manage voter status, biometric enrollment, and election readiness.</p>
                  </div>
              </div>
                <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                  className="admin-btn-secondary px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> Import Students
                </button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Voters", value: stats.total, color: "text-foreground" },
                { label: "Bio Verified", value: stats.verified, color: "text-primary" },
                { label: "Have Voted", value: stats.voted, color: "text-success" },
                { label: "Suspended", value: stats.suspended, color: "text-destructive" },
              ].map((s, i) => (
                <motion.div key={i} className="admin-card rounded-xl p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                  <p className="admin-kpi mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or matric number..."
                  className="admin-input h-10 pl-10 pr-4 text-xs" />
              </div>
              <select value={filterBio} onChange={(e) => setFilterBio(e.target.value)}
                className="admin-input h-10 px-3 text-xs appearance-none">
                <option value="all">All Bio Status</option>
                <option value="verified">Verified</option>
                <option value="not_enrolled">Not Enrolled</option>
                <option value="flagged">Flagged</option>
              </select>
              <select value={filterVote} onChange={(e) => setFilterVote(e.target.value)}
                className="admin-input h-10 px-3 text-xs appearance-none">
                <option value="all">All Vote Status</option>
                <option value="voted">Voted</option>
                <option value="not_voted">Not Voted</option>
              </select>
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                className="admin-input h-10 px-3 text-xs appearance-none">
                <option value="all">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="admin-card rounded-xl overflow-hidden border-border/70">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-muted/35 dark:bg-muted/15">
                      {["Voter", "Faculty / Dept", "Biometric", "Vote Status", "Device", "Risk", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[11px] text-foreground/70 dark:text-muted-foreground tracking-wider uppercase font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground"><div className="w-6 h-6 rounded-full border-t-2 border-r-2 border-primary animate-spin mx-auto" /></td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No voters found.</td></tr>
                    ) : (
                      filtered.map((v, i) => (
                        <motion.tr key={v.id} className="border-b border-border/15 hover:bg-primary/5 dark:hover:bg-muted/20 transition-colors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-foreground font-medium text-xs">{v.name}</p>
                              <p className="text-[10px] text-foreground/60 dark:text-muted-foreground">{v.matricNo}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground/75 dark:text-muted-foreground">{v.faculty} / {v.department}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full ${bioStatusCfg[v.bioStatus].bg} ${bioStatusCfg[v.bioStatus].color}`}>
                              {bioStatusCfg[v.bioStatus].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {v.voteStatus === "voted" ? (
                              <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3 h-3" /> Voted</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-foreground/65 dark:text-muted-foreground"><Clock className="w-3 h-3" /> Not Voted</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground/70 dark:text-muted-foreground">{v.device}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full ${riskCfg[v.riskLevel].bg} ${riskCfg[v.riskLevel].color}`}>
                              {v.riskLevel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => { setSelected(v); setView("profile"); }} className="p-1.5 rounded border border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5 hover:border-primary/25 transition-all" title="View Profile">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {v.status === "ACTIVE" ? (
                                <button onClick={() => handleStatusUpdate(v.id, "SUSPENDED")} className="p-1.5 rounded border border-transparent text-muted-foreground hover:text-warning hover:bg-warning/5 hover:border-warning/25 transition-all" title="Suspend Voter">
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button onClick={() => handleStatusUpdate(v.id, "ACTIVE")} className="p-1.5 rounded border border-transparent text-muted-foreground hover:text-success hover:bg-success/5 hover:border-success/25 transition-all" title="Activate Voter">
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isSuperAdmin && (
                                <button onClick={() => handleDelete(v.id, v.name)} className="p-1.5 rounded border border-transparent text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/25 transition-all" title="Delete Voter">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Critical notice */}
            <div className="mt-6 admin-card rounded-xl p-4 border border-warning/10">
              <p className="text-[10px] text-warning/70 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                Admin can only see whether a voter has voted — never how they voted. Vote secrecy is cryptographically enforced.
              </p>
            </div>
          </motion.div>
        )}

        {/* PROFILE */}
        {view === "profile" && selected && (
          <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors text-sm">← Back</button>
              <h2 className="text-xl font-semibold text-foreground">{selected.name}</h2>
              <span className={`text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full ${riskCfg[selected.riskLevel].bg} ${riskCfg[selected.riskLevel].color}`}>
                {selected.riskLevel} risk
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Voter Info */}
              <div className="admin-card rounded-xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><UserCheck className="w-4 h-4 text-primary" /> Voter Info</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ["Voter ID", selected.id],
                    ["Matric No.", selected.matricNo],
                    ["Email", selected.email],
                    ["Faculty", selected.faculty],
                    ["Department", selected.department],
                    ["Bio Status", bioStatusCfg[selected.bioStatus].label],
                    ["Bio Enrolled", selected.bioEnrolledAt],
                    ["Vote Status", selected.voteStatus === "voted" ? "✔ Has Voted" : "❌ Has Not Voted"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Device & Login */}
              <div className="admin-card rounded-xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4 text-primary" /> Device & Login</h3>
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device</span>
                    <span className="text-foreground text-xs">{selected.device}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last IP</span>
                    <span className="text-foreground text-xs font-mono">{selected.deviceHash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Login</span>
                    <span className="text-foreground text-xs">{selected.lastLogin}</span>
                  </div>
                </div>
                <h4 className="text-xs text-muted-foreground tracking-wider uppercase mb-2 mt-4 pt-3 border-t border-border/20">Login History</h4>
                <div className="space-y-2">
                  {selected.loginHistory.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{l.date}</span>
                      <span className="text-muted-foreground">{l.ip}</span>
                      <span className="text-foreground">{l.device}</span>
                    </div>
                  ))}
                  {selected.loginHistory.length === 0 && <p className="text-[10px] text-muted-foreground">No login history.</p>}
                </div>
              </div>

              {/* Actions & Risk */}
              <div className="space-y-5">
                <div className={`admin-card rounded-xl p-6 ${selected.suspiciousActivity.length > 0 ? "border border-destructive/10" : ""}`}>
                  <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><AlertTriangle className={`w-4 h-4 ${selected.suspiciousActivity.length > 0 ? "text-destructive" : "text-muted-foreground"}`} /> Account Health</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <span className={`text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full ${selected.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {selected.status}
                      </span>
                    </div>
                    {selected.suspiciousActivity.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {selected.suspiciousActivity.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 flex-shrink-0" />
                            <span className="text-destructive/80">{a}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selected.suspiciousActivity.length === 0 && <p className="text-[10px] text-muted-foreground">No suspicious activity detected.</p>}
                  </div>
                </div>

                <div className="admin-card rounded-xl p-6">
                  <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Management Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selected.status === "ACTIVE" ? (
                      <button onClick={() => handleStatusUpdate(selected.id, "SUSPENDED")} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-warning/5 border border-warning/20 text-xs text-warning hover:bg-warning/10 transition-all">
                        <Pause className="w-3.5 h-3.5" /> Suspend
                      </button>
                    ) : (
                      <button onClick={() => handleStatusUpdate(selected.id, "ACTIVE")} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-success/5 border border-success/20 text-xs text-success hover:bg-success/10 transition-all">
                        <Play className="w-3.5 h-3.5" /> Activate
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button onClick={() => handleDelete(selected.id, selected.name)} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isSuperAdmin && (
        <div className="mt-4 rounded-xl border border-border/30 bg-muted/15 px-4 py-3 text-xs text-muted-foreground">
          Permanent voter deletion is restricted to super admins.
        </div>
      )}

      {/* Import Confirmation Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="admin-card max-w-md w-full p-6 border border-primary/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirm Import</h3>
                <p className="text-xs text-muted-foreground">{selectedFile?.name}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              How would you like to handle the existing student records in the official registry?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => onImportConfirm('add')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 border border-border/30 hover:border-primary/50 transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Add to Existing</p>
                  <p className="text-[10px] text-muted-foreground">Keep current records and only add new ones from file.</p>
                </div>
                <Play className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all" />
              </button>

              <button
                onClick={() => onImportConfirm('overwrite')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-destructive">Overwrite Table</p>
                  <p className="text-[10px] text-muted-foreground">CRITICAL: Delete all current records and replace with file content.</p>
                </div>
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => { setShowImportModal(false); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="admin-card max-w-md w-full p-6 border border-destructive/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete Voter</h3>
                <p className="text-xs text-muted-foreground">{deleteTarget.name}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete this voter and all associated records. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Global Notifications for Import */}
      <AnimatePresence>
        {(importError || importSuccess || importLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
          >
            {importLoading && (
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md shadow-2xl">
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-medium text-primary">Processing data import...</span>
              </div>
            )}
            {importError && (
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-destructive/10 border border-destructive/20 backdrop-blur-md shadow-2xl">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-medium text-destructive">{importError}</span>
                <button onClick={() => setImportError(null)} className="ml-2 text-destructive/50 hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {importSuccess && (
              <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-success/10 border border-success/20 backdrop-blur-md shadow-2xl">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-xs font-medium text-success">{importSuccess}</span>
                <button onClick={() => setImportSuccess(null)} className="ml-2 text-success/50 hover:text-success"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Voters;


