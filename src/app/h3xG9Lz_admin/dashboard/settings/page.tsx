"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Settings, Globe, Loader2, Save, Shield, RefreshCw, KeyRound, UserCog, Trash2, MoreHorizontal
} from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { getSystemSettings, updateSystemSettings, createAdmin, getAdmins, updateAdminAccount, updateAdminStatus, resetAdminSecurity, deleteAdminAccount, type AdminAccount } from "@/services/adminService";
import { UserPlus, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { getStoredAdminUser, isStoredSuperAdmin } from "@/lib/adminSession";

type SettingsTab = "general" | "admins";

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
  { id: "general", label: "General", icon: Globe },
  { id: "admins", label: "Administrators", icon: Shield },
];

const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/10 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

// Real data will be fetched via useEffect

export default function SettingsPage() {
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });

  // Settings specific state
  const [settings, setSettings] = useState({
    universityName: "",
    systemName: "",
    systemLogo: "",
  });

  // Admin creation state
  const [newAdmin, setNewAdmin] = useState({ username: "", email: "", role: "admin" });
  const [adminCreating, setAdminCreating] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ text: "", type: "" });
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [showDeleteAdminModal, setShowDeleteAdminModal] = useState(false);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<AdminAccount | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    setIsSuperAdmin(isStoredSuperAdmin());
    setCurrentAdminId(getStoredAdminUser()?.id || null);

    async function loadSettings() {
      try {
        const resp = await getSystemSettings();
        if (resp.success && resp.data) {
          const settingsMap = (resp.data as any[]).reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
          }, {});

          setSettings({
            universityName: settingsMap['UNIVERSITY_NAME'] || "",
            systemName: settingsMap['SYSTEM_NAME'] || "",
            systemLogo: settingsMap['SYSTEM_LOGO'] || "",
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadAdmins();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!openActionMenuId) return;
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openActionMenuId]);

  const loadAdmins = async () => {
    setAdminsLoading(true);
    try {
      const resp = await getAdmins();
      if (resp.success && resp.data) {
        setAdminAccounts(resp.data);
      }
    } finally {
      setAdminsLoading(false);
    }
  };



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setSaveMessage({ text: "Only super admins can update system settings", type: "error" });
      return;
    }
    setSaving(true);
    setSaveMessage({ text: "", type: "" });

    try {
      const payload = [
        { key: 'UNIVERSITY_NAME', value: settings.universityName, description: 'The global display name for the university' },
        { key: 'SYSTEM_NAME', value: settings.systemName, description: 'The global system name' },
        { key: 'SYSTEM_LOGO', value: settings.systemLogo, description: 'The global system logo url' }
      ];

      const resp = await updateSystemSettings(payload);
      if (resp.success) {
        setSaveMessage({ text: "Settings saved successfully", type: "success" });
      } else {
        setSaveMessage({ text: (resp as any).error || "Failed to save settings", type: "error" });
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveMessage({ text: "An error occurred while saving", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage({ text: "", type: "" }), 3000);
    }
  };


  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setAdminMessage({ text: "Only super admins can create administrator accounts", type: "error" });
      return;
    }
    setAdminCreating(true);
    setAdminMessage({ text: "", type: "" });

    try {
      const resp = await createAdmin(newAdmin);
      if (resp.success) {
        setAdminMessage({ text: "Administrator account created and setup link sent successfully", type: "success" });
        setNewAdmin({ username: "", email: "", role: "admin" });
        await loadAdmins();
      } else {
        setAdminMessage({ text: (resp as any).error || "Failed to create administrator", type: "error" });
      }
    } catch (error) {
      console.error("Admin creation error:", error);
      setAdminMessage({ text: "An error occurred", type: "error" });
    } finally {
      setAdminCreating(false);
      setTimeout(() => setAdminMessage({ text: "", type: "" }), 5000);
    }
  };

  const handleRoleChange = async (admin: AdminAccount, role: "admin" | "super_admin") => {
    setActiveActionId(admin.id);
    setAdminMessage({ text: "", type: "" });
    try {
      const resp = await updateAdminAccount(admin.id, { role });
      if (resp.success) {
        setAdminMessage({ text: `Updated ${admin.username} to ${role}`, type: "success" });
        await loadAdmins();
        setOpenActionMenuId(null);
      } else {
        setAdminMessage({ text: resp.error || "Failed to update admin role", type: "error" });
      }
    } finally {
      setActiveActionId(null);
    }
  };

  const handleStatusToggle = async (admin: AdminAccount) => {
    setActiveActionId(admin.id);
    setAdminMessage({ text: "", type: "" });
    try {
      const nextStatus = admin.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const resp = await updateAdminStatus(admin.id, nextStatus);
      if (resp.success) {
        setAdminMessage({ text: `${admin.username} is now ${nextStatus.toLowerCase()}`, type: "success" });
        await loadAdmins();
        setOpenActionMenuId(null);
      } else {
        setAdminMessage({ text: resp.error || "Failed to update admin status", type: "error" });
      }
    } finally {
      setActiveActionId(null);
    }
  };

  const handleSecurityReset = async (admin: AdminAccount) => {
    setActiveActionId(admin.id);
    setAdminMessage({ text: "", type: "" });
    try {
      const resp = await resetAdminSecurity(admin.id);
      if (resp.success) {
        setAdminMessage({ text: resp.message || `Security reset completed for ${admin.username}`, type: "success" });
        await loadAdmins();
        setOpenActionMenuId(null);
      } else {
        setAdminMessage({ text: resp.error || "Failed to reset admin security", type: "error" });
      }
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDeleteAdmin = async (admin: AdminAccount) => {
    const superAdminCount = adminAccounts.filter((account) => account.role === "super_admin" && account.status !== "SUSPENDED").length;
    const isSelf = currentAdminId === admin.id;
    const isProtectedLastActiveSuper = admin.role === "super_admin" && admin.status !== "SUSPENDED" && superAdminCount <= 1;

    if (isSelf) {
      setAdminMessage({ text: "You cannot delete your own account", type: "error" });
      return;
    }

    if (isProtectedLastActiveSuper) {
      setAdminMessage({ text: "You cannot delete the last active super admin", type: "error" });
      return;
    }

    setDeleteAdminTarget(admin);
    setShowDeleteAdminModal(true);
    setOpenActionMenuId(null);
  };

  const confirmDeleteAdmin = async () => {
    if (!deleteAdminTarget) return;

    setActiveActionId(deleteAdminTarget.id);
    setAdminMessage({ text: "", type: "" });
    try {
      const resp = await deleteAdminAccount(deleteAdminTarget.id);
      if (resp.success) {
        setAdminMessage({ text: `${deleteAdminTarget.username} has been deleted`, type: "success" });
        await loadAdmins();
        setShowDeleteAdminModal(false);
        setDeleteAdminTarget(null);
      } else {
        setAdminMessage({ text: resp.error || "Failed to delete admin account", type: "error" });
      }
    } finally {
      setActiveActionId(null);
    }
  };



  if (loading) {
    return (
      <DashboardLayout breadcrumb={["Settings"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumb={["Settings"]}>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
      </div>

      <div className="flex flex-wrap gap-1 mb-8 glass-card rounded-xl p-1.5 w-fit">
        {tabs.filter((tab) => isSuperAdmin || tab.id !== "admins").map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${activeTab === tab.id
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {activeTab === "general" && (
          <form onSubmit={handleSave} className="glass-card rounded-xl p-6 max-w-2xl">
            <h3 className="text-sm font-medium text-foreground mb-4">General Settings</h3>
            <div className="space-y-0">
              <FieldRow label="System Name">
                <input
                  value={settings.systemName}
                  onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                  className="w-48 h-9 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all text-right"
                />
              </FieldRow>
              <FieldRow label="Institution Name">
                <input
                  value={settings.universityName}
                  onChange={(e) => setSettings({ ...settings, universityName: e.target.value })}
                  className="w-64 h-9 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all text-right"
                />
              </FieldRow>
              <FieldRow label="System Logo URL">
                <div className="flex items-center gap-2">
                  {settings.systemLogo && (
                    <img src={settings.systemLogo} alt="Logo" className="w-6 h-6 object-contain rounded" />
                  )}
                  <input
                    value={settings.systemLogo}
                    onChange={(e) => setSettings({ ...settings, systemLogo: e.target.value })}
                    placeholder="https://..."
                    className="w-64 h-9 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all text-right"
                  />
                </div>
              </FieldRow>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-border/10 pt-6">
              <div>
                {saveMessage.text && (
                  <span className={`text-xs font-medium ${saveMessage.type === "success" ? "text-emerald-400" : "text-destructive"}`}>
                    {saveMessage.text}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={saving || !isSuperAdmin}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-xs hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,119,255,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : isSuperAdmin ? "Save Changes" : "Super Admin Only"}
              </button>
            </div>
          </form>
        )}

        {activeTab === "admins" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleCreateAdmin} className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Register New Admin</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      required
                      placeholder="e.g. admin_john"
                      value={newAdmin.username}
                      onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                      disabled={!isSuperAdmin}
                      className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/30 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <input
                      required
                      type="email"
                      placeholder="admin@university.edu"
                      value={newAdmin.email}
                      onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      disabled={!isSuperAdmin}
                      className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/30 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium ml-1">Role</label>
                  <select
                    value={newAdmin.role}
                    onChange={e => setNewAdmin({ ...newAdmin, role: e.target.value })}
                    disabled={!isSuperAdmin}
                    className="w-full h-10 px-4 rounded-xl bg-muted/30 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    <option value="admin">Standard Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

              </div>

              {adminMessage.text && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 border ${adminMessage.type === "success" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-destructive/5 border-destructive/20 text-destructive"}`}>
                  {adminMessage.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 mt-0.5" />}
                  <span className="text-[10px] font-medium leading-tight">{adminMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={adminCreating || !isSuperAdmin}
                className="w-full mt-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:shadow-[0_0_20px_rgba(0,119,255,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adminCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                {adminCreating ? "Creating..." : isSuperAdmin ? "Create Account" : "Super Admin Only"}
              </button>
            </form>

            <div className="glass-card rounded-xl p-6 border border-primary/10 bg-primary/5">
              <h3 className="text-sm font-medium text-foreground mb-4">Account Policies</h3>
              <ul className="space-y-3">
                {[
                  "Only super admins can create and manage administrator accounts.",
                  "New admins are created with the standard admin role by default.",
                  "Email addresses must be unique and institution-verified.",
                  "New admins must complete biometric setup via the emailed link.",
                  "Deleting election, candidate, and voter records is reserved for super admins.",
                  "Every management action is logged to the audit trail."
                ].map((policy, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
                    {policy}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 glass-card rounded-xl p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-medium text-foreground">Administrator Accounts</h3>
                </div>
                <button
                  type="button"
                  onClick={loadAdmins}
                  disabled={adminsLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {adminsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : adminAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No administrator accounts found yet.</p>
              ) : (
                <div className="space-y-3">
                  {adminAccounts.map((admin) => {
                    const isSelf = currentAdminId === admin.id;
                    const isBusy = activeActionId === admin.id;
                    const activeSuperAdminCount = adminAccounts.filter((account) => account.role === "super_admin" && account.status !== "SUSPENDED").length;
                    const isProtectedLastActiveSuper = admin.role === "super_admin" && admin.status !== "SUSPENDED" && activeSuperAdminCount <= 1;

                    return (
                      <div key={admin.id} className="rounded-xl border border-border/30 bg-muted/10 p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{admin.username}</p>
                              <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wide ${admin.role === "super_admin" ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                                {admin.role === "super_admin" ? "Super Admin" : "Admin"}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wide ${admin.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                                {admin.status}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-1 rounded-full text-[10px] uppercase tracking-wide bg-warning/10 text-warning">
                                  You
                                </span>
                              )}
                              {isProtectedLastActiveSuper && (
                                <span className="px-2 py-1 rounded-full text-[10px] uppercase tracking-wide bg-destructive/10 text-destructive">
                                  Protected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{admin.email}</p>
                            <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-muted-foreground">
                              <span>Biometric: {admin.webauthn_registered ? "Registered" : "Pending"}</span>
                              <span>Last login: {admin.last_login_at ? new Date(admin.last_login_at).toLocaleString() : "Never"}</span>
                              <span>Created: {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "-"}</span>
                            </div>
                            {(isSelf || isProtectedLastActiveSuper) && (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {isSelf ? "Your account cannot be deleted or suspended by you." : "This account is the last active super admin and is protected."}
                              </p>
                            )}
                          </div>

                          <div className="relative self-start" ref={openActionMenuId === admin.id ? actionMenuRef : null}>
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId((current) => current === admin.id ? null : admin.id)}
                              disabled={isBusy}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background/40 text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all disabled:opacity-50"
                              aria-label={`Open actions for ${admin.username}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {openActionMenuId === admin.id && (
                              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-xl z-20 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleRoleChange(admin, admin.role === "super_admin" ? "admin" : "super_admin")}
                                  disabled={isBusy}
                                  className="w-full px-4 py-3 text-left text-xs text-foreground hover:bg-muted/20 transition-colors disabled:opacity-50"
                                >
                                  {admin.role === "super_admin" ? "Make Admin" : "Promote to Super"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStatusToggle(admin)}
                                  disabled={isBusy || isSelf}
                                  className="w-full px-4 py-3 text-left text-xs text-foreground hover:bg-muted/20 transition-colors disabled:opacity-50"
                                >
                                  {admin.status === "ACTIVE" ? "Suspend" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSecurityReset(admin)}
                                  disabled={isBusy}
                                  className="w-full px-4 py-3 text-left text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  Reset Security
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdmin(admin)}
                                  disabled={isBusy || isSelf || isProtectedLastActiveSuper}
                                  className="w-full px-4 py-3 text-left text-xs text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50 flex items-center gap-2 border-t border-border/20"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!isSuperAdmin && activeTab === "general" && (
          <p className="mt-4 text-xs text-muted-foreground">
            General settings are viewable by admins, but only super admins can modify them.
          </p>
        )}

      </motion.div>
      {showDeleteAdminModal && deleteAdminTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card max-w-md w-full p-6 border border-destructive/30"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Delete Administrator</h3>
                <p className="text-xs text-muted-foreground">{deleteAdminTarget.username}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will permanently delete this administrator account. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteAdminModal(false); setDeleteAdminTarget(null); }}
                className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAdmin}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/15 transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
