"use client"

import { useEffect, useState } from "react"
import { Bell, Shield, User, Globe, Loader2 } from "lucide-react"
import { getCurrentUser } from "@/services/authService"

export function SettingsView() {
  const [user, setUser] = useState<any>(null);

  // Notification States
  const [notifState, setNotifState] = useState({
    electionAlerts: true,
    resultAnnouncements: true,
    systemUpdates: false
  });

  useEffect(() => {
    const loadUser = async () => {
      // First try localStorage for immediate UI
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) { }
      }

      // Then fetch fresh data from server
      try {
        const resp = await getCurrentUser();
        if (resp.success && resp.data) {
          setUser(resp.data);
          localStorage.setItem('user', JSON.stringify(resp.data));
        }
      } catch (e) { }
    };

    loadUser();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch {
      return "Never";
    }
  };

  const handleToggle = (key: keyof typeof notifState) => {
    setNotifState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const settingsGroups = [
    {
      title: "Profile",
      icon: User,
      items: [
        { label: "Full Name", value: user?.name || "Loading..." },
        { label: "Email", value: user?.email || "Loading..." },
        { label: "Student ID", value: user?.matricNumber || "Loading..." },
      ],
    },
    {
      title: "Security",
      icon: Shield,
      items: [
        { label: "Biometric Lock", value: user ? (user.biometricStatus === 'VERIFIED' ? "Active" : "Disabled") : "Loading..." },
        { label: "Last Login", value: user ? formatDate(user.last_login_at) : "Loading..." },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        { label: "Election Alerts", key: 'electionAlerts', value: notifState.electionAlerts ? "On" : "Off", isToggle: true },
        { label: "Result Announcements", key: 'resultAnnouncements', value: notifState.resultAnnouncements ? "On" : "Off", isToggle: true },
        { label: "System Updates", key: 'systemUpdates', value: notifState.systemUpdates ? "On" : "Off", isToggle: true },
      ],
    },
    {
      title: "Preferences",
      icon: Globe,
      items: [
        { label: "Language", value: "English" },
        { label: "Timezone", value: "WAT (UTC+1)" },
      ],
    },
  ]

  return (
    <div className="animate-fade-in-up">
      <h2 className="mb-6 text-lg font-semibold text-foreground">Settings</h2>

      <div className="stagger-children space-y-5">
        {settingsGroups.map((group) => (
          <div key={group.title} className="glass rounded-xl p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <group.icon className="h-4 w-4 text-secondary" />
              <h3 className="text-sm font-semibold text-foreground">
                {group.title}
              </h3>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                  {item.isToggle ? (
                    <button
                      onClick={() => handleToggle(item.key as keyof typeof notifState)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${item.value === "On" ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                      role="switch"
                      aria-checked={item.value === "On"}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.value === "On" ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
