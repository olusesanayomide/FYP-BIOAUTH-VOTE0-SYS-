"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings, Globe, Loader2, Save, Shield
} from "lucide-react";
import DashboardLayout from "@/components/admin/DashboardLayout";
import { getSystemSettings, updateSystemSettings, createAdmin } from "@/services/adminService";
import { UserPlus, RefreshCw, Key, Mail, User, AlertCircle, CheckCircle2 } from "lucide-react";

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
  const [newAdmin, setNewAdmin] = useState({ username: "", email: "" });
  const [adminCreating, setAdminCreating] = useState(false);
  const [adminMessage, setAdminMessage] = useState({ text: "", type: "" });

  useEffect(() => {
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



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setAdminCreating(true);
    setAdminMessage({ text: "", type: "" });

    try {
      const resp = await createAdmin(newAdmin);
      if (resp.success) {
        setAdminMessage({ text: "Administrator account created and setup link sent successfully", type: "success" });
        setNewAdmin({ username: "", email: "" });
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
        {tabs.map((tab) => (
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
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-xs hover:scale-[1.02] hover:shadow-[0_0_16px_rgba(0,119,255,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? "Saving..." : "Save Changes"}
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
                      className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/30 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
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
                disabled={adminCreating}
                className="w-full mt-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:shadow-[0_0_20px_rgba(0,119,255,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {adminCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                {adminCreating ? "Creating..." : "Create Account"}
              </button>
            </form>

            <div className="glass-card rounded-xl p-6 border border-primary/10 bg-primary/5">
              <h3 className="text-sm font-medium text-foreground mb-4">Account Policies</h3>
              <ul className="space-y-3">
                {[
                  "All new admins have full permissions by default.",
                  "Email addresses must be unique and institution-verified.",
                  "New admins must complete biometric setup via the emailed link.",
                  "Every management action is logged to the audit trail."
                ].map((policy, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
                    {policy}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

      </motion.div>
    </DashboardLayout>
  );
}
