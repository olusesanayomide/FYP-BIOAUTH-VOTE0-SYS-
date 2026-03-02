"use client";

import { ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Vote, Users, UserCheck, Fingerprint, FileText,
  Brain, ShieldAlert, Settings, LogOut, Bell, Search, Shield,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { getSystemSettings } from "@/services/adminService";
import { ThemeToggle } from "@/components/ThemeToggle";

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/h3xG9Lz_admin/dashboard" },
  { title: "Elections", icon: Vote, path: "/h3xG9Lz_admin/dashboard/elections" },
  { title: "Candidates", icon: Users, path: "/h3xG9Lz_admin/dashboard/candidates" },
  { title: "Voter Registry", icon: UserCheck, path: "/h3xG9Lz_admin/dashboard/voters" },
  { title: "Biometric Logs", icon: Fingerprint, path: "/h3xG9Lz_admin/dashboard/biometrics" },
  { title: "Audit Trail", icon: FileText, path: "/h3xG9Lz_admin/dashboard/audit" },
  { title: "AI Insights", icon: Brain, path: "/h3xG9Lz_admin/dashboard/ai" },
  { title: "Security Center", icon: ShieldAlert, path: "/h3xG9Lz_admin/dashboard/security" },
  { title: "Settings", icon: Settings, path: "/h3xG9Lz_admin/dashboard/settings" },
];

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumb?: string[];
}

const DashboardLayout = ({ children, breadcrumb = ["Dashboard"] }: DashboardLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    Cookies.remove("admin_token", { path: "/" });
    router.push("/");
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [universityName, setUniversityName] = useState("SECURE-VOTE");
  const [systemName, setSystemName] = useState("VOTING-SYSTEM");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const resp = await getSystemSettings();
        if (resp.success && resp.data) {
          const settingsMap = resp.data.reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
          }, {});

          if (settingsMap['UNIVERSITY_NAME']) setUniversityName(settingsMap['UNIVERSITY_NAME']);
          if (settingsMap['SYSTEM_NAME']) setSystemName(settingsMap['SYSTEM_NAME']);
          if (settingsMap['SYSTEM_LOGO']) setLogoUrl(settingsMap['SYSTEM_LOGO']);
        }
      } catch (error) {
        console.error("DashboardLayout settings fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <div className="absolute inset-0 grid-overlay pointer-events-none" />

      {/* Sidebar */}
      <motion.aside
        className="fixed left-0 top-0 bottom-0 w-[260px] glass z-50 flex flex-col border-r border-border/30"
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/h3xG9Lz_admin/dashboard")}>
            {logoUrl ? (
              <img src={logoUrl} alt="System Logo" className="w-9 h-9 rounded-lg object-contain bg-white/5" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(187, 100%, 50%), hsl(270, 91%, 65%))" }}>
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-semibold text-foreground tracking-tight">{systemName}</h1>
              <p className="text-[10px] text-muted-foreground tracking-wider">ELECTION CONTROL</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const currentPathname = pathname || "";
            const active = currentPathname === item.path || (item.path !== "/h3xG9Lz_admin/dashboard" && currentPathname.startsWith(item.path));
            return (
              <button
                key={item.title}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 group relative ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
              >
                {active && (
                  <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
                )}
                <item.icon className={`w-4 h-4 transition-all duration-300 ${active ? "text-primary" : "group-hover:text-primary/60"}`} />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="ml-[260px] flex-1 flex flex-col min-h-screen relative z-10">
        <motion.header
          className="h-14 glass border-b border-border/20 flex items-center justify-between px-6 sticky top-0 z-40"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => router.push("/h3xG9Lz_admin/dashboard")}>Home</span>
            <span className="text-border">/</span>
            <span>Admin</span>
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-border">/</span>
                <span className={i === breadcrumb.length - 1 ? "text-foreground" : ""}>{item}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
              <span className="text-xs text-success/80 tracking-wider font-medium">SYSTEM ONLINE</span>
            </div>
            <ThemeToggle />
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-300">
              <Search className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-300 relative">
              <Bell className="w-4 h-4" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ml-2 text-primary-foreground" style={{ background: "linear-gradient(135deg, hsl(187, 100%, 50%), hsl(270, 91%, 65%))" }}>
              A
            </div>
          </div>
        </motion.header>

        <main className="flex-1 p-6 lg:p-10 space-y-8">
          {children}
        </main>

        <footer className="px-10 py-4 border-t border-border/10">
          <p className="text-[10px] text-muted-foreground/30 text-center tracking-wider">
            All administrative actions are logged and monitored. Region: West Africa Deployment • Encryption: AES-256 Secure
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
