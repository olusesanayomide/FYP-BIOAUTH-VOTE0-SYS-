"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote, Plus, Eye, Edit, PauseCircle, Archive, Activity, Clock, CheckCircle2,
  AlertTriangle, X, Calendar, Users, Shield, Fingerprint, BarChart3, Ban, Search, PlayCircle, Trash, Download, FileText, FileCode, MoreHorizontal
} from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import apiClient from "@/services/api";
import { isStoredSuperAdmin } from "@/lib/adminSession";

type ElectionStatus = "ongoing" | "upcoming" | "completed" | "suspended";
type ViewMode = "list" | "create" | "detail";
interface Election {
  id: string;
  name: string;
  description: string;
  type: string;
  scope: string;
  status: ElectionStatus;
  startDate: string;
  endDate: string;
  rawStartDate: string;
  rawEndDate: string;
  biometricEnforced: boolean;
  realTimeMonitoring: boolean;
  eligibilityRules: string;
  registeredVoters: number;
  verifiedBiometric: number;
  votesCast: number;
  fraudAlerts: number;
  resultsPublished: boolean;
}

// Dynamic fetching prevents using hardcoded mocks

const statusConfig: Record<ElectionStatus, { label: string; color: string; bg: string; border: string; glow: string; icon: typeof Activity }> = {
  ongoing: { label: "Ongoing", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", glow: "glow-cyan", icon: Activity },
  upcoming: { label: "Upcoming", color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", glow: "glow-amber", icon: Clock },
  completed: { label: "Completed", color: "text-success", bg: "bg-success/10", border: "border-success/20", glow: "glow-emerald", icon: CheckCircle2 },
  suspended: { label: "Suspended", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", glow: "glow-crimson", icon: Ban },
};

// Babcock University Data structure
const babcockFaculties = [
  "Computing Sciences",
  "Basic Medical Sciences",
  "Law",
  "Education and Humanities",
  "Management Sciences",
  "Public and Allied Health",
];

const babcockDepartments: Record<string, string[]> = {
  "Computing Sciences": ["Software Engineering", "Computer Science", "Information Technology", "Computer Technology"],
  "Basic Medical Sciences": ["Anatomy", "Physiology", "Biochemistry"],
  "Law": ["Law"],
  "Education and Humanities": ["English", "History", "Education"],
  "Management Sciences": ["Accounting", "Business Administration", "Economics"],
  "Public and Allied Health": ["Public Health", "Nursing", "Medical Laboratory Science"],
};

const Elections = () => {
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [elections, setElections] = useState<Election[]>([]);
  const [isLoadingElections, setIsLoadingElections] = useState(true);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [openActionMenuAbove, setOpenActionMenuAbove] = useState(false);

  // Fetch elections on mount
  useEffect(() => {
    setIsSuperAdmin(isStoredSuperAdmin());
    fetchElections();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (openActionMenuId && actionMenuRef.current && !actionMenuRef.current.contains(target)) {
        setOpenActionMenuId(null);
        setOpenActionMenuAbove(false);
      }

      if (showExportOptions && exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setShowExportOptions(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openActionMenuId, showExportOptions]);

  useEffect(() => {
    if (!feedbackMessage) return;

    const timer = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const fetchElections = async () => {
    setIsLoadingElections(true);
    try {
      const response = await apiClient.get('/admin/elections');
      const data = response.data;

      if (data.success) {
        // Map database schema to frontend Election interface
        const mappedData: Election[] = data.data.map((dbElection: any) => {

          // Determine scope string based on type
          let scopeStr = "University-Wide";
          if (dbElection.type === "Faculty") scopeStr = dbElection.scope_faculty || "Faculty";
          if (dbElection.type === "Departmental") scopeStr = dbElection.scope_department || "Department";

          // Respect explicit backend status first, then fall back to date-based derivation.
          let mappedStatus: ElectionStatus = "upcoming";
          const now = new Date();
          const start = new Date(dbElection.start_time);
          const end = new Date(dbElection.end_time);

          if (dbElection.status === "suspended") mappedStatus = "suspended";
          else if (dbElection.status === "completed") mappedStatus = "completed";
          else if (dbElection.status === "ongoing" || dbElection.status === "active") mappedStatus = "ongoing";
          else if (now > end) mappedStatus = "completed";
          else if (now >= start && now <= end) mappedStatus = "ongoing";

          return {
            id: dbElection.id,
            name: dbElection.title,
            description: dbElection.description || "",
            type: dbElection.type || "Presidential",
            scope: scopeStr,
            status: mappedStatus,
            startDate: new Date(dbElection.start_time).toLocaleString(),
            endDate: new Date(dbElection.end_time).toLocaleString(),
            rawStartDate: dbElection.start_time,
            rawEndDate: dbElection.end_time,
            biometricEnforced: dbElection.biometric_enforced || false,
            realTimeMonitoring: dbElection.real_time_monitoring || false,
            eligibilityRules: dbElection.eligibility_rules || "All registered students",
            registeredVoters: dbElection.registeredVoters || 0,
            verifiedBiometric: dbElection.verifiedBiometric || 0,
            votesCast: dbElection.votesCast || 0,
            fraudAlerts: dbElection.fraudAlerts || 0,
            resultsPublished: dbElection.results_published === true,
          };
        });
        setElections(mappedData);
      }
    } catch (error) {
      console.error("Failed to fetch elections", error);
    } finally {
      setIsLoadingElections(false);
    }
  };

  const fetchAnalytics = async (id: string) => {
    try {
      const response = await apiClient.get(`/admin/elections/${id}/analytics`);
      const data = response.data;
      if (data.success) {
        setElections(prev => prev.map(e => e.id === id ? {
          ...e,
          registeredVoters: data.data.registeredVoters,
          verifiedBiometric: data.data.verifiedBiometric,
          votesCast: data.data.votesCast,
          fraudAlerts: data.data.fraudAlerts
        } : e));

        // Also update selectedElection if it's currently open
        setSelectedElection(prev => prev?.id === id ? {
          ...prev,
          registeredVoters: data.data.registeredVoters,
          verifiedBiometric: data.data.verifiedBiometric,
          votesCast: data.data.votesCast,
          fraudAlerts: data.data.fraudAlerts
        } : prev);
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
  };

  // Create form state
  const [formData, setFormData] = useState({
    name: "", description: "", type: "Presidential", scopeFaculty: "", scopeDepartment: "", scopeLevel: "",
    startDate: "", endDate: "",
    biometricEnforced: true, realTimeMonitoring: true, eligibilityRules: "", positions: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [dateServerError, setDateServerError] = useState("");

  const dateValidationError = (() => {
    if (!formData.startDate || !formData.endDate) return "";
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Start and end date must be valid.";
    if (end <= start) return "End time must be later than start time.";
    return "";
  })();

  const handleCreateSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    setDateServerError("");
    try {
      if (!formData.name || !formData.startDate || !formData.endDate) {
        throw new Error("Election Name, Start Date, and End Date are required.");
      }
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Start and end date must be valid.");
      }
      if (end <= start) {
        throw new Error("End time must be later than start time.");
      }
      const payload = {
        ...formData,
        positions: formData.positions ? formData.positions.split(',').map(s => s.trim()).filter(Boolean) : [],
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        votingMethod: "Single Choice",
        maxVotes: 1
      };
      const response = editingId
        ? await apiClient.put(`/admin/elections/${editingId}`, payload)
        : await apiClient.post('/admin/elections', payload);

      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || data.message || "Failed to create election");
      }

      // Reset form and go to list
      setFormData({
        name: "", description: "", type: "Presidential", scopeFaculty: "", scopeDepartment: "", scopeLevel: "",
        startDate: "", endDate: "",
        biometricEnforced: true, realTimeMonitoring: true, eligibilityRules: "", positions: "",
      });
      setEditingId(null);
      // Re-fetch to update list
      fetchElections();
      setView("list");
    } catch (error: any) {
      const message = error.message || "Failed to create election";
      setSubmitError(message);
      if (message.toLowerCase().includes("end time") || message.toLowerCase().includes("start and end")) {
        setDateServerError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetail = (el: Election) => {
    setSelectedElection(el);
    fetchAnalytics(el.id);
    setView("detail");
  };

  const toggleActionMenu = (electionId: string, trigger: HTMLButtonElement) => {
    if (openActionMenuId === electionId) {
      setOpenActionMenuId(null);
      setOpenActionMenuAbove(false);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const estimatedMenuHeight = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;
    setOpenActionMenuAbove(openAbove);
    setOpenActionMenuId(electionId);
  };

  const handleSuspend = async () => {
    if (!showSuspendConfirm) return;
    try {
      await apiClient.patch(`/admin/elections/${showSuspendConfirm}/status`, { status: "suspended" });
      setShowSuspendConfirm(null);
      setOpenActionMenuId(null);
      setOpenActionMenuAbove(false);
      fetchElections(); // Refresh list to get new status
    } catch (error) {
      console.error("Failed to suspend election", error);
    }
  };

  const handleEndElection = async () => {
    if (!showEndConfirm || !isSuperAdmin) return;
    try {
      const response = await apiClient.patch(`/admin/elections/${showEndConfirm}/status`, { status: "completed" });
      if (!response.data?.success) {
        throw new Error(response.data?.error || response.data?.message || "Failed to end election");
      }
      setFeedbackMessage({ text: "Election ended successfully", type: "success" });
      setShowEndConfirm(null);
      setOpenActionMenuId(null);
      setOpenActionMenuAbove(false);
      fetchElections();
      setSelectedElection((prev) =>
        prev?.id === showEndConfirm
          ? { ...prev, status: "completed", rawEndDate: new Date().toISOString(), endDate: new Date().toLocaleString() }
          : prev,
      );
    } catch (error) {
      console.error("Failed to end election", error);
      setFeedbackMessage({ text: "Failed to end election", type: "error" });
    }
  };

  const handleUnsuspend = async (id: string) => {
    try {
      await apiClient.patch(`/admin/elections/${id}/status`, { status: "active" });
      setOpenActionMenuId(null);
      setOpenActionMenuAbove(false);
      fetchElections();
    } catch (error) {
      console.error("Failed to unsuspend election", error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isSuperAdmin) return;
    setOpenActionMenuId(null);
    setOpenActionMenuAbove(false);
    setDeleteTarget({ id, name });
    setShowDeleteConfirm(true);
  };

  const isElectionOngoingByTime = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    const now = new Date();
    return now >= start && now <= end;
  };

  const isElectionCurrentlyOngoing = (election: Election) => {
    if (election.status === "completed" || election.status === "suspended") return false;
    if (election.status === "ongoing") return true;
    return isElectionOngoingByTime(election.rawStartDate, election.rawEndDate);
  };

  const handleResultsPublish = async (id: string, publish: boolean) => {
    try {
      const response = await apiClient.patch(`/admin/elections/${id}/results`, {
        results_published: publish
      });
      const data = response.data;
      if (!data.success) throw new Error(data.error || data.message || "Failed to update results visibility");

      setElections(prev => prev.map(e => e.id === id ? { ...e, resultsPublished: publish } : e));
      setSelectedElection(prev => prev?.id === id ? { ...prev, resultsPublished: publish } : prev);
    } catch (error) {
      console.error("Failed to update results visibility", error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const response = await apiClient.delete(`/admin/elections/${deleteTarget.id}`);
      if (!response.data?.success) {
        throw new Error(response.data?.error || response.data?.message || "Failed to delete election");
      }
      fetchElections();
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      setFeedbackMessage({ text: "Election deleted successfully", type: "success" });
    } catch (error: any) {
      console.error(error);
      setFeedbackMessage({ text: error?.response?.data?.error || error?.message || "Failed to delete election", type: "error" });
    }
  };

  const openEdit = async (el: Election) => {
    // Map back to form structure
    const toDateTimeLocal = (dateString: string) => {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    let posString = "";
    try {
      const res = await apiClient.get(`/admin/elections/${el.id}/positions`);
      if (res.data.success && res.data.positions) {
        posString = res.data.positions.join(", ");
      }
    } catch(err) {
      console.error(err);
    }

    setFormData({
      name: el.name, description: el.description, type: el.type,
      scopeFaculty: el.type !== "Presidential" ? el.scope : "",
      scopeDepartment: el.type === "Departmental" ? el.scope : "",
      scopeLevel: "",
      startDate: toDateTimeLocal(el.startDate), endDate: toDateTimeLocal(el.endDate),
      biometricEnforced: el.biometricEnforced, realTimeMonitoring: el.realTimeMonitoring, eligibilityRules: el.eligibilityRules, positions: posString,
    });
    setEditingId(el.id);
    setView("create");
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!selectedElection) return;
    setIsExporting(format);
    try {
      const response = await apiClient.get(`/admin/elections/${selectedElection.id}/export`, {
        params: { format },
        responseType: 'blob'
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedElection.name.replace(/\s+/g, "_")}_Result.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed", error);
      setFeedbackMessage({ text: "Failed to export election report. Please try again.", type: "error" });
    } finally {
      setIsExporting(null);
      setShowExportOptions(false);
    }
  };

  return (
    <DashboardLayout breadcrumb={["Elections"]}>
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            className="fixed top-24 right-4 sm:right-6 z-[140] max-w-sm w-[calc(100vw-2rem)] sm:w-full"
          >
            <div
              className={`rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm text-sm ${
                feedbackMessage.type === "success"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : "border-destructive/25 bg-destructive/10 text-destructive"
              }`}
            >
              {feedbackMessage.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {/* â”€â”€â”€â”€â”€ LIST VIEW â”€â”€â”€â”€â”€ */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Vote className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground tracking-tight">Elections</h2>
              </div>
              <button
                onClick={() => setView("create")}
                className="admin-btn-primary px-4 py-2.5 text-sm font-medium shadow-[0_8px_20px_-14px_hsl(var(--primary)/0.55)]"
              >
                <Plus className="w-4 h-4" />
                Create Election
              </button>
            </div>

            {/* Status summary */}
            <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-4 mb-8 pb-2 snap-x hide-scrollbar">
              {(["ongoing", "upcoming", "completed", "suspended"] as ElectionStatus[]).map((s) => {
                const cfg = statusConfig[s];
                const count = elections.filter((e) => e.status === s).length;
                return (
                  <motion.div key={s} className={`admin-card rounded-xl p-4 border ${cfg.border} min-w-[140px] md:min-w-0 snap-start flex-shrink-0`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-semibold ${cfg.color}`}>{count}</span>
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">{s}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Election cards */}
            {isLoadingElections ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-primary animate-spin" />
              </div>
            ) : elections.length === 0 ? (
              <div className="admin-card rounded-xl p-12 text-center border-dashed border-border/50">
                <Vote className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Elections Found</h3>
                <p className="text-sm text-muted-foreground mb-6">You haven't created any elections yet.</p>
                <button
                  onClick={() => setView("create")}
                  className="admin-btn-primary px-6 py-2.5 text-sm font-medium"
                >
                  Create Your First Election
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search elections by name, type, or date..."
                    className="admin-input h-12 pl-10 pr-4 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {elections.filter(e =>
                    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    e.startDate.includes(searchQuery) ||
                    e.endDate.includes(searchQuery)
                  ).map((el, i) => {
                    const cfg = statusConfig[el.status];
                    const progress = el.registeredVoters > 0 ? Math.round((el.votesCast / el.registeredVoters) * 100) : 0;
                    const isCurrentlyOngoing = isElectionCurrentlyOngoing(el);
                    return (
                      <motion.div
                        key={el.id}
                        className={`admin-card rounded-xl p-6 border ${cfg.border} transition-all duration-300 cursor-pointer ${hoveredCard === el.id ? cfg.glow : ""}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        onMouseEnter={() => setHoveredCard(el.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        whileHover={{ y: -3 }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{el.id}</span>
                        </div>
                        <h4 className="text-sm font-medium text-foreground mb-1">{el.name}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{el.type} - {el.scope}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-4">
                          <span>Start: {el.startDate}</span>
                          <span>End: {el.endDate}</span>
                          <span>Voters: {el.registeredVoters.toLocaleString()}</span>
                          <span>Verified: {el.verifiedBiometric.toLocaleString()}</span>
                        </div>
                        {/* Progress */}
                        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden mb-2">
                          <motion.div
                            className={`h-full rounded-full ${el.status === "ongoing" ? "bg-primary" : el.status === "completed" ? "bg-success" : el.status === "suspended" ? "bg-destructive" : "bg-warning"}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{progress}% turnout - {el.votesCast.toLocaleString()} votes cast</p>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/20">
                          <button onClick={() => openDetail(el)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-all">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <div className="relative ml-auto" ref={openActionMenuId === el.id ? actionMenuRef : null}>
                            <button
                              onClick={(event) => toggleActionMenu(el.id, event.currentTarget)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                              aria-label={`Open actions for ${el.name}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {openActionMenuId === el.id && (
                                <motion.div
                                  initial={{ opacity: 0, y: openActionMenuAbove ? -8 : 8, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: openActionMenuAbove ? -8 : 8, scale: 0.98 }}
                                  className={`absolute right-0 w-48 admin-card rounded-xl border border-border/40 shadow-xl z-[70] overflow-hidden ${
                                    openActionMenuAbove ? "bottom-full mb-2" : "top-full mt-2"
                                  }`}
                                >
                                  {el.status !== "completed" && (
                                    <button onClick={() => { openEdit(el); setOpenActionMenuId(null); setOpenActionMenuAbove(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-primary/5 transition-colors border-b border-border/10">
                                      <Edit className="w-4 h-4" />
                                      <span>Edit</span>
                                    </button>
                                  )}
                                  {el.status === "ongoing" && (
                                    <button onClick={() => { setShowSuspendConfirm(el.id); setOpenActionMenuId(null); setOpenActionMenuAbove(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-warning hover:bg-warning/5 transition-colors border-b border-border/10">
                                      <PauseCircle className="w-4 h-4" />
                                      <span>Suspend</span>
                                    </button>
                                  )}
                                  {isSuperAdmin && el.status === "ongoing" && (
                                    <button onClick={() => { setShowEndConfirm(el.id); setOpenActionMenuId(null); setOpenActionMenuAbove(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors border-b border-border/10">
                                      <Ban className="w-4 h-4" />
                                      <span>End Election</span>
                                    </button>
                                  )}
                                  {el.status === "suspended" && (
                                    <button onClick={() => handleUnsuspend(el.id)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-success hover:bg-success/5 transition-colors border-b border-border/10">
                                      <PlayCircle className="w-4 h-4" />
                                      <span>Resume</span>
                                    </button>
                                  )}
                                  {el.status === "completed" && (
                                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/20 transition-colors border-b border-border/10">
                                      <Archive className="w-4 h-4" />
                                      <span>Archive</span>
                                    </button>
                                  )}
                                  {isSuperAdmin && (
                                    <button
                                      onClick={() => {
                                        if (isCurrentlyOngoing) return;
                                        handleDelete(el.id, el.name);
                                      }}
                                      disabled={isCurrentlyOngoing}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                                      title={isCurrentlyOngoing ? "Cannot delete an ongoing election" : "Delete Election"}
                                    >
                                      <Trash className="w-4 h-4" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Suspend confirmation overlay */}
            <AnimatePresence>
              {showSuspendConfirm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="admin-card rounded-2xl p-8 max-w-md w-full mx-4 border border-warning/20">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      <h3 className="text-lg font-semibold text-foreground">Confirm Suspension</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">This will immediately halt all voting activity. Voters will be unable to cast ballots until the election is resumed. This action will be logged.</p>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowSuspendConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">Cancel</button>
                      <button onClick={handleSuspend} className="px-4 py-2 rounded-lg text-sm font-medium bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20 transition-all">Suspend Election</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showEndConfirm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="admin-card rounded-2xl p-8 max-w-md w-full mx-4 border border-destructive/20">
                    <div className="flex items-center gap-3 mb-4">
                      <Ban className="w-5 h-5 text-destructive" />
                      <h3 className="text-lg font-semibold text-foreground">End Election</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">This will immediately end the ongoing election and stop all further voting. Only a super admin can perform this action.</p>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowEndConfirm(null)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">Cancel</button>
                      <button onClick={handleEndElection} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all">End Election</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Delete confirmation overlay */}
            <AnimatePresence>
              {showDeleteConfirm && deleteTarget && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="admin-card rounded-2xl p-8 max-w-md w-full mx-4 border border-destructive/20">
                    <div className="flex items-center gap-3 mb-4">
                      <Trash className="w-5 h-5 text-destructive" />
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Delete Election</h3>
                        <p className="text-xs text-muted-foreground">{deleteTarget.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-6">This will permanently delete this election and all associated data. This action cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">Cancel</button>
                      <button onClick={confirmDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all">Delete Election</button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* â”€â”€â”€â”€â”€ CREATE/EDIT VIEW â”€â”€â”€â”€â”€ */}
        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {editingId ? <Edit className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
                <h2 className="text-xl font-semibold text-foreground">{editingId ? "Edit Election" : "Create New Election"}</h2>
              </div>
              <button onClick={() => { setView("list"); setEditingId(null); setFormData({ name: "", description: "", type: "Presidential", scopeFaculty: "", scopeDepartment: "", scopeLevel: "", startDate: "", endDate: "", biometricEnforced: true, realTimeMonitoring: true, eligibilityRules: "", positions: "", }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="admin-card rounded-2xl p-8 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Election Name</label>
                  <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Presidential Student Council 2026"
                    className="admin-input h-12 px-4 text-sm placeholder:text-muted-foreground/60" />
                </div>
                {/* Description */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Brief description of this election..."
                    className="admin-input px-4 py-3 text-sm placeholder:text-muted-foreground/60 resize-none" />
                </div>
                {/* Type */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Election Type</label>
                  <select value={formData.type} onChange={(e) => {
                    setFormData({
                      ...formData,
                      type: e.target.value,
                      scopeFaculty: e.target.value === "Presidential" ? "" : (babcockFaculties[0] || ""),
                      scopeDepartment: e.target.value === "Departmental" ? (babcockDepartments[babcockFaculties[0]]?.[0] || "") : ""
                    })
                  }}
                    className="admin-input h-12 px-4 text-sm appearance-none">
                    <option value="Presidential">General</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Departmental">Departmental</option>
                  </select>
                </div>

                {/* Scope: Faculty (Only show if not Presidential) */}
                {formData.type !== "Presidential" && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground tracking-wide uppercase">Faculty Scope</label>
                    <select value={formData.scopeFaculty} onChange={(e) => {
                      setFormData({
                        ...formData,
                        scopeFaculty: e.target.value,
                        scopeDepartment: formData.type === "Departmental" ? (babcockDepartments[e.target.value]?.[0] || "") : ""
                      })
                    }}
                      className="admin-input h-12 px-4 text-sm appearance-none">
                      {babcockFaculties.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                )}

                {/* Scope: Department (Only show if Departmental) */}
                {formData.type === "Departmental" && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground tracking-wide uppercase">Department Scope</label>
                    <select value={formData.scopeDepartment} onChange={(e) => setFormData({ ...formData, scopeDepartment: e.target.value })}
                      className="admin-input h-12 px-4 text-sm appearance-none">
                      {(babcockDepartments[formData.scopeFaculty || babcockFaculties[0]] || []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                {/* Scope: Level */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Student Level Scope</label>
                  <select value={formData.scopeLevel} onChange={(e) => setFormData({ ...formData, scopeLevel: e.target.value })}
                    className="admin-input h-12 px-4 text-sm appearance-none">
                    <option value="">All Levels</option>
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                    <option value="600">600 Level</option>
                    <option value="700">700 Level</option>
                  </select>
                </div>
                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Start Date & Time</label>
                  <input type="datetime-local" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="admin-input h-12 px-4 text-sm" />
                </div>
                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">End Date & Time</label>
                  <input type="datetime-local" value={formData.endDate} min={formData.startDate || undefined} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="admin-input h-12 px-4 text-sm" />
                  {(dateValidationError || dateServerError) && (
                    <p className="text-xs text-destructive">{dateValidationError || dateServerError}</p>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Voter Eligibility Rules</label>
                  <input value={formData.eligibilityRules} onChange={(e) => setFormData({ ...formData, eligibilityRules: e.target.value })} placeholder="e.g. Only 300 Level Students"
                    className="admin-input h-12 px-4 text-sm placeholder:text-muted-foreground/60" />
                </div>
                {/* Positions */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Available Positions</label>
                  <input value={formData.positions} onChange={(e) => setFormData({ ...formData, positions: e.target.value })} placeholder="Comma-separated (e.g. President, Vice President, Secretary)"
                    className="admin-input h-12 px-4 text-sm placeholder:text-muted-foreground/60" />
                </div>
                {/* Toggles */}
                <div className="md:col-span-2 flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setFormData({ ...formData, biometricEnforced: !formData.biometricEnforced })}
                      className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 ${formData.biometricEnforced ? "bg-primary/30 border-primary/50" : "bg-muted border-border/50"} border`}>
                      <div className={`w-5 h-5 rounded-full transition-all duration-300 ${formData.biometricEnforced ? "translate-x-4 bg-primary" : "bg-muted-foreground/50"}`} />
                    </div>
                    <span className="text-sm text-muted-foreground">Enable Biometric Enforcement</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setFormData({ ...formData, realTimeMonitoring: !formData.realTimeMonitoring })}
                      className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 ${formData.realTimeMonitoring ? "bg-primary/30 border-primary/50" : "bg-muted border-border/50"} border`}>
                      <div className={`w-5 h-5 rounded-full transition-all duration-300 ${formData.realTimeMonitoring ? "translate-x-4 bg-primary" : "bg-muted-foreground/50"}`} />
                    </div>
                    <span className="text-sm text-muted-foreground">Enable Real-Time Monitoring</span>
                  </label>
                </div>
              </div>

            </div>

            {submitError && (
              <div className="mt-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {submitError}
              </div>
            )}

            <div className="flex gap-3 mt-8 pt-6 border-t border-border/20">
              <button onClick={() => { setView("list"); setEditingId(null); setFormData({ name: "", description: "", type: "Presidential", scopeFaculty: "", scopeDepartment: "", scopeLevel: "", startDate: "", endDate: "", biometricEnforced: true, realTimeMonitoring: true, eligibilityRules: "", positions: "", }); }} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50">Cancel</button>
              <button onClick={handleCreateSubmit} disabled={isSubmitting || !!dateValidationError}
                className="admin-btn-primary px-6 py-2.5 text-sm font-medium transition-all duration-300 hover:scale-[1.01] flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100">
                {isSubmitting ? "Saving..." : (editingId ? "Update Election" : "Create Election")}
              </button>
            </div>
          </motion.div>
        )}

        {/* â”€â”€â”€â”€â”€ DETAIL VIEW â”€â”€â”€â”€â”€ */}
        {view === "detail" && selectedElection && (
          <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
            {(() => {
              const end = new Date(selectedElection.rawEndDate);
              const canPublishResults = !isNaN(end.getTime()) && new Date() > end;
              // Even if not strictly ended, let admins see/click it if they want, but maybe warn
              return (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors text-sm">&lt;- Back</button>
                <h2 className="text-xl font-semibold text-foreground">{selectedElection.name}</h2>
                <span className={`text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full ${statusConfig[selectedElection.status].bg} ${statusConfig[selectedElection.status].color}`}>
                  {statusConfig[selectedElection.status].label}
                </span>
              </div>
              <div className="flex gap-2 relative">
                {selectedElection.status === "ongoing" && (
                  <button onClick={() => setShowSuspendConfirm(selectedElection.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-warning bg-warning/5 hover:bg-warning/10 border border-warning/20 transition-all">
                    <PauseCircle className="w-4 h-4" /> Suspend
                  </button>
                )}
                {isSuperAdmin && selectedElection.status === "ongoing" && (
                  <button onClick={() => setShowEndConfirm(selectedElection.id)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-destructive bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 transition-all">
                    <Ban className="w-4 h-4" /> End Election
                  </button>
                )}
                {!isSuperAdmin && (
                  <div className="px-3 py-2 rounded-lg text-xs text-muted-foreground border border-border/30 bg-muted/15">
                    Only super admins can end or delete an election. Admins can suspend only.
                  </div>
                )}
                <div className="relative" ref={showExportOptions ? exportMenuRef : null}>
                  <button
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    disabled={isExporting !== null}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-foreground bg-muted/20 border border-border/40 hover:bg-muted/30 transition-all disabled:opacity-50"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 rounded-full border-t-2 border-primary animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export Result
                  </button>

                  <AnimatePresence>
                    {showExportOptions && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-48 admin-card rounded-xl border border-border/40 shadow-xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={() => handleExport("pdf")}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-primary/5 transition-colors border-b border-border/10"
                        >
                          <FileText className="w-4 h-4 text-primary" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => handleExport("docx")}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-primary/5 transition-colors"
                        >
                          <FileCode className="w-4 h-4 text-blue-500" />
                          <span>Microsoft Word</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => handleResultsPublish(selectedElection.id, !selectedElection.resultsPublished)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${selectedElection.resultsPublished
                    ? "text-muted-foreground bg-muted/30 border-border/40 hover:bg-muted/40"
                    : "text-primary bg-primary/5 border-primary/20 hover:bg-primary/10"
                    }`}
                >
                  {selectedElection.resultsPublished ? "Hide Results" : "Publish Results"}
                </button>
              </div>
            </div>
              );
            })()}

            {/* Overview stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Registered Voters", value: selectedElection.registeredVoters.toLocaleString(), icon: Users, color: "text-foreground" },
                { label: "Biometric Verified", value: selectedElection.verifiedBiometric.toLocaleString(), icon: Fingerprint, color: "text-primary" },
                { label: "Votes Cast", value: selectedElection.votesCast.toLocaleString(), icon: BarChart3, color: "text-success" },
                { label: "Fraud Alerts", value: selectedElection.fraudAlerts.toString(), icon: AlertTriangle, color: selectedElection.fraudAlerts > 0 ? "text-destructive" : "text-muted-foreground" },
              ].map((stat, i) => (
                <motion.div key={i} className="admin-card rounded-xl p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <stat.icon className={`w-4 h-4 ${stat.color} mb-3`} />
                  <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground tracking-wider mt-1 uppercase">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Summary card */}
              <div className="admin-card rounded-xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Election Details</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ["Type", selectedElection.type],
                    ["Scope", selectedElection.scope],
                    ["Start Date", selectedElection.startDate],
                    ["End Date", selectedElection.endDate],
                    ["Eligibility", selectedElection.eligibilityRules],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & integrity card */}
              <div className="admin-card rounded-xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Vote Integrity</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biometric Enforcement</span>
                    <span className={selectedElection.biometricEnforced ? "text-success" : "text-muted-foreground"}>{selectedElection.biometricEnforced ? "Active" : "Disabled"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Real-Time Monitoring</span>
                    <span className={selectedElection.realTimeMonitoring ? "text-success" : "text-muted-foreground"}>{selectedElection.realTimeMonitoring ? "Active" : "Disabled"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Encryption</span>
                    <span className="text-foreground">AES-256</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fraud Alerts</span>
                    <span className={selectedElection.fraudAlerts > 0 ? "text-destructive" : "text-success"}>{selectedElection.fraudAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Integrity Status</span>
                    <span className={selectedElection.fraudAlerts === 0 ? "text-success" : "text-warning"}>{selectedElection.fraudAlerts === 0 ? "Clean" : "Under Review"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Results Visibility</span>
                    <span className={selectedElection.resultsPublished ? "text-success" : "text-muted-foreground"}>
                      {selectedElection.resultsPublished ? "Published" : "Hidden"}
                    </span>
                  </div>
                </div>

                {selectedElection.status === "ongoing" && (
                  <div className="mt-6 pt-4 border-t border-border/20">
                    <p className="text-[10px] text-warning/70 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> Candidate modification is locked during an ongoing election.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout >
  );
};

export default Elections;

