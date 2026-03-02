"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Eye, Edit, CheckCircle2, Clock, XCircle, X, UserCircle, FileText, Upload, Ban, Search } from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import Cookies from "js-cookie";
import { supabase } from "@/lib/supabase";

type CandidateStatus = "approved" | "pending" | "rejected";
type ViewMode = "list" | "add" | "detail";

interface Candidate {
  id: string;
  name: string;
  position: string;
  party: string;
  faculty: string;
  department: string;
  studentId: string;
  email: string;
  bio: string;
  status: CandidateStatus;
  electionId: string;
  electionName: string;
  photoUrl: string;
  manifestoUrl: string;
  approvalHistory: { date: string; action: string; admin: string; note: string }[];
}

// Dynamic fetching prevents using hardcoded mocks

const statusCfg: Record<CandidateStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "Approved", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-warning", bg: "bg-warning/10", icon: Clock },
  rejected: { label: "Rejected", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const Candidates = () => {
  const [view, setView] = useState<ViewMode>("list");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [filterElection, setFilterElection] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [electionsConfig, setElectionsConfig] = useState<{ id: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [form, setForm] = useState({ name: "", position: "", studentId: "", email: "", bio: "", electionId: "", status: "pending" as CandidateStatus });
  const [photo, setPhoto] = useState<File | null>(null);
  const [manifesto, setManifesto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const getAuthHeaders = (): Record<string, string> => {
    const token = Cookies.get("admin_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Fetch Elections
      const elRes = await fetch(`${apiUrl}/admin/elections`, { headers: getAuthHeaders() });
      const elData = await elRes.json();
      if (elData.success) {
        setElectionsConfig(elData.data.map((e: any) => ({ id: e.id, name: e.title })));
      }

      // Fetch Candidates
      const candRes = await fetch(`${apiUrl}/admin/candidates`, { headers: getAuthHeaders() });
      const candData = await candRes.json();
      if (candData.success) {
        setCandidates(candData.data.map((dbCand: any) => ({
          id: dbCand.id,
          name: dbCand.name,
          position: dbCand.position,
          party: dbCand.party || "Independent",
          faculty: dbCand.faculty || "Unknown",
          department: dbCand.department || "Unknown",
          studentId: dbCand.student_id,
          email: dbCand.email,
          bio: dbCand.bio || "",
          status: dbCand.status as CandidateStatus,
          electionId: dbCand.election_id,
          electionName: dbCand.election_name,
          photoUrl: dbCand.photo_url || "",
          manifestoUrl: dbCand.manifesto_url || "",
          approvalHistory: [] // Can be wired up later to audit_logs
        })));
      }
    } catch (error) {
      console.error("Failed to load candidates UI", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      let photoUrl = "";
      let manifestoUrl = "";

      // Upload Photo if exists
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `candidates/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('candidate_photos')
          .upload(filePath, photo);

        if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('candidate_photos')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Upload Manifesto if exists
      if (manifesto) {
        const fileExt = manifesto.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `manifestos/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('candidate_manifestos')
          .upload(filePath, manifesto);

        if (uploadError) throw new Error(`Manifesto upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('candidate_manifestos')
          .getPublicUrl(filePath);

        manifestoUrl = publicUrl;
      }

      const response = await fetch(`${apiUrl}/admin/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          ...form,
          photoUrl,
          manifestoUrl
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to add candidate");
      }

      // Reset form and go to list
      setForm({ name: "", position: "", studentId: "", email: "", bio: "", electionId: "", status: "pending" as CandidateStatus });
      setPhoto(null);
      setManifesto(null);
      fetchInitialData(); // Re-hydrate list
      setView("list");
    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: CandidateStatus) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/admin/candidates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error("Failed to update status");

      // Update local state without full refetch for crisp UI feel
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error(error);
      alert("Failed to update candidate status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete candidate: ${name}?`)) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/admin/candidates/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("Failed to delete candidate");

      // Remove local copy
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
      alert("Failed to delete candidate");
    }
  };

  const electionNames = Array.from(new Set(electionsConfig.map((e) => e.name)));
  const filtered = candidates.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesElection = filterElection === "all" || c.electionName === filterElection;
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;

    return matchesSearch && matchesElection && matchesStatus;
  });

  return (
    <DashboardLayout breadcrumb={["Candidates"]}>
      <AnimatePresence mode="wait">
        {/* LIST */}
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Candidates</h2>
              </div>
              <button onClick={() => setView("add")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, hsl(187, 100%, 50%), hsl(187, 80%, 40%))", color: "#0B0E14", boxShadow: "0 0 20px hsla(187,100%,50%,0.15)" }}>
                <Plus className="w-4 h-4" /> Add Candidate
              </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or matric number..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all" />
              </div>
              <select value={filterElection} onChange={(e) => setFilterElection(e.target.value)}
                className="h-10 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none">
                <option value="all">All Elections</option>
                {electionNames.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none">
                <option value="all">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20">
                      {["Candidate", "Position", "Party", "Faculty", "Election", "Status", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-[10px] text-muted-foreground tracking-wider uppercase font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground"><div className="w-6 h-6 rounded-full border-t-2 border-r-2 border-primary animate-spin mx-auto" /></td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No candidates match the current filters.</td></tr>
                    ) : (
                      filtered.map((c, i) => {
                        const cfg = statusCfg[c.status];
                        return (
                          <motion.tr key={c.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{c.name.charAt(0)}</div>
                                <div>
                                  <p className="text-foreground font-medium text-xs">{c.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{c.studentId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.position}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.party}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.faculty}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{c.electionName.substring(0, 25)}...</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 items-center">
                                <button onClick={() => { setSelected(c); setView("detail"); }} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all" title="View Details"><Eye className="w-3.5 h-3.5" /></button>

                                {c.status !== "approved" && (
                                  <button onClick={() => handleStatusChange(c.id, "approved")} className="p-1.5 rounded text-muted-foreground hover:text-success hover:bg-success/5 transition-all" title="Approve"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                )}

                                {c.status !== "pending" && (
                                  <button onClick={() => handleStatusChange(c.id, "pending")} className="p-1.5 rounded text-muted-foreground hover:text-warning hover:bg-warning/5 transition-all" title="Set to Pending"><Clock className="w-3.5 h-3.5" /></button>
                                )}

                                {c.status !== "rejected" && (
                                  <button onClick={() => handleStatusChange(c.id, "rejected")} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all" title="Reject"><Ban className="w-3.5 h-3.5" /></button>
                                )}

                                {c.status === "rejected" && (
                                  <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20 ml-1" title="Permanently Delete">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ADD */}
        {view === "add" && (
          <motion.div key="add" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Add Candidate</h2>
              </div>
              <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="glass-card rounded-2xl p-8 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Full Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Candidate full name"
                    className="w-full h-12 px-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_15px_hsla(187,100%,50%,0.1)] transition-all duration-300" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Position</label>
                  <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. President"
                    className="w-full h-12 px-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all duration-300" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Student ID</label>
                  <input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="22/0000"
                    className="w-full h-12 px-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all duration-300" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="candidate1@student.babcock.edu.ng"
                    className="w-full h-12 px-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all duration-300" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Biography</label>
                  <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} placeholder="Brief candidate biography..."
                    className="w-full px-4 py-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-all duration-300 resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Assign to Election</label>
                  <select value={form.electionId} onChange={(e) => setForm({ ...form, electionId: e.target.value })}
                    className="w-full h-12 px-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none">
                    <option value="">Select Election</option>
                    {electionsConfig.map((ec) => (
                      <option key={ec.id} value={ec.id}>{ec.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Approval Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CandidateStatus })}
                    className="w-full h-12 px-4 rounded-lg bg-muted/40 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                {/* Upload zones */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Upload Photo</label>
                  <label className="h-24 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center cursor-pointer hover:border-primary/30 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && setPhoto(e.target.files[0])} />
                    <div className="text-center">
                      <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">{photo ? photo.name : "Click to upload"}</p>
                    </div>
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground tracking-wide uppercase">Upload Manifesto (PDF)</label>
                  <label className="h-24 rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center cursor-pointer hover:border-primary/30 transition-colors">
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files && setManifesto(e.target.files[0])} />
                    <div className="text-center">
                      <FileText className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                      <p className="text-[10px] text-muted-foreground">{manifesto ? manifesto.name : "Click to upload PDF"}</p>
                    </div>
                  </label>
                </div>
              </div>

              {submitError && (
                <div className="mt-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <span className="w-4 h-4 text-destructive flex items-center justify-center font-bold">!</span> {submitError}
                </div>
              )}

              <div className="flex gap-3 mt-8 pt-6 border-t border-border/20">
                <button onClick={() => setView("list")} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50">Cancel</button>
                <button onClick={handleCreateSubmit} disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-[1.02] flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: "linear-gradient(135deg, hsl(187, 100%, 50%), hsl(187, 80%, 40%))", color: "#0B0E14", boxShadow: "0 0 20px hsla(187,100%,50%,0.15)" }}>
                  {isSubmitting ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* DETAIL */}
        {view === "detail" && selected && (
          <motion.div key="detail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors text-sm">← Back</button>
              <h2 className="text-xl font-semibold text-foreground">{selected.name}</h2>
              <span className={`text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full ${statusCfg[selected.status].bg} ${statusCfg[selected.status].color}`}>
                {statusCfg[selected.status].label}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Profile */}
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">{selected.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-foreground font-medium">{selected.name}</h3>
                    <p className="text-xs text-muted-foreground">{selected.position} • {selected.party}</p>
                    <p className="text-xs text-muted-foreground">{selected.email}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ["Student ID", selected.studentId],
                    ["Faculty", selected.faculty],
                    ["Department", selected.department],
                    ["Election", selected.electionName],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-border/20">
                  <p className="text-xs text-muted-foreground tracking-wide uppercase mb-2">Biography</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{selected.bio}</p>
                </div>
              </div>

              {/* Approval History */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2"><UserCircle className="w-4 h-4 text-primary" /> Approval History</h3>
                <div className="relative space-y-0">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border/30" />
                  {selected.approvalHistory.map((h, i) => (
                    <div key={i} className="flex items-start gap-4 py-3 relative">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 bg-background flex-shrink-0 mt-0.5 relative z-10 ${h.action === "Approved" ? "border-success" : h.action === "Rejected" ? "border-destructive" : "border-primary/40"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">{h.action}</p>
                        <p className="text-[10px] text-muted-foreground">{h.note}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{h.date} • {h.admin}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selected.status === "pending" && (
                  <div className="flex gap-2 mt-6 pt-4 border-t border-border/20">
                    <button className="flex-1 py-2 rounded-lg text-sm font-medium bg-success/10 text-success hover:bg-success/20 border border-success/20 transition-all">Approve</button>
                    <button className="flex-1 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20 transition-all">Reject</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Candidates;
