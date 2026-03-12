"use client"

import { Bell, CheckCircle2, Clock, LogOut, Menu, Settings, User, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getSystemSettings } from "@/services/adminService"
import { getElections } from "@/services/votingService"
import { ThemeToggle } from "@/components/ThemeToggle"

interface TopNavProps {
  onToggleSidebar: () => void
}

interface TopNavNotification {
  id: string
  title: string
  description: string
  type: "info" | "success" | "warning"
  time: string
  isRead: boolean
  category: "election" | "results" | "system" | "verification"
}

export function TopNav({ onToggleSidebar }: TopNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [universityName, setUniversityName] = useState("University Voting Portal")
  const [systemName, setSystemName] = useState("VOTE-CORE")
  const [systemLogo, setSystemLogo] = useState("")
  const [userInitials, setUserInitials] = useState("US")
  const [userName, setUserName] = useState("Voter")
  const [userEmail, setUserEmail] = useState("")
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState<TopNavNotification[]>([])

  useEffect(() => {
    // Fetch global system settings (University Name)
    const fetchSettings = async () => {
      try {
        const resp = await getSystemSettings()
        if (resp.success && resp.data) {
          const uniSetting = resp.data.find((s: any) => s.key === 'UNIVERSITY_NAME')
          if (uniSetting) setUniversityName(uniSetting.value)

          const sysSetting = resp.data.find((s: any) => s.key === 'SYSTEM_NAME')
          if (sysSetting) setSystemName(sysSetting.value)

          const logoSetting = resp.data.find((s: any) => s.key === 'SYSTEM_LOGO')
          if (logoSetting) setSystemLogo(logoSetting.value)
        }
      } catch (e) {
        console.error("Failed to load global settings", e);
      }
    }

    // Get user details
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.name) {
          setUserName(parsed.name)
          if (parsed.email) setUserEmail(parsed.email)
          const initials = parsed.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()
          setUserInitials(initials)
        }
      } catch (e) { }
    }

    const getNotifPrefs = () => {
      const fallback = { electionAlerts: true, resultAnnouncements: true }
      const raw = localStorage.getItem('voter_notif_prefs')
      if (!raw) return fallback
      try {
        const parsed = JSON.parse(raw)
        return {
          electionAlerts: parsed.electionAlerts !== false,
          resultAnnouncements: parsed.resultAnnouncements !== false,
        }
      } catch {
        return fallback
      }
    }

    const fetchNotifications = async () => {
      const items: TopNavNotification[] = []
      const now = new Date()

      try {
        const resp = await getElections()
        if (resp.success && resp.data) {
          const current = now.getTime()
          const ongoing = resp.data.filter((e) => {
            const s = new Date(e.startDate).getTime()
            const en = new Date(e.endDate).getTime()
            return current >= s && current <= en
          })

          const upcoming = resp.data
            .filter((e) => new Date(e.startDate).getTime() > current)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

          if (ongoing.length > 0) {
            items.push({
              id: "ongoing-elections",
              title: "Election in progress",
              description: `${ongoing.length} active election${ongoing.length > 1 ? "s" : ""} available now.`,
              type: "success",
              time: "Now",
              isRead: false,
              category: "election",
            })
          }

          if (upcoming[0]) {
            items.push({
              id: `upcoming-${upcoming[0].id}`,
              title: "Upcoming election",
              description: `${upcoming[0].title} starts ${new Date(upcoming[0].startDate).toLocaleString()}.`,
              type: "info",
              time: "Upcoming",
              isRead: false,
              category: "election",
            })
          }
        }
      } catch (e) {
        items.push({
          id: "election-fetch-warning",
          title: "Election updates unavailable",
          description: "Unable to load election notifications right now.",
          type: "warning",
          time: "Just now",
          isRead: false,
          category: "system",
        })
      }

      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          if (parsed.biometricStatus !== "VERIFIED") {
            items.push({
              id: "verify-biometrics",
              title: "Complete biometric verification",
              description: "Verify biometrics to participate in restricted elections.",
              type: "warning",
              time: "Action needed",
              isRead: false,
              category: "verification",
            })
          }
        } catch (e) { }
      }

      const prefs = getNotifPrefs()
      const filtered = items.filter((n) => {
        if (n.category === "election" && !prefs.electionAlerts) return false
        if (n.category === "results" && !prefs.resultAnnouncements) return false
        return true
      })

      if (filtered.length === 0) {
        items.push({
          id: "all-clear",
          title: "No new alerts",
          description: "You are all caught up.",
          type: "info",
          time: "Now",
          isRead: true,
          category: "system",
        })
      }

      setNotifications(filtered.length > 0 ? filtered : items)
    }

    fetchSettings()
    fetchNotifications()
  }, [])

  useEffect(() => {
    const closeMenus = () => {
      setShowNotifMenu(false)
      setShowProfileMenu(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenus()
    }
    document.addEventListener("keydown", onEsc)
    return () => document.removeEventListener("keydown", onEsc)
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const openDashboardView = (view: "history" | "settings") => {
    localStorage.setItem("voter_active_view", view)
    if (pathname === "/dashboard") {
      window.dispatchEvent(new CustomEvent("voter:set-active-view", { detail: view }))
    } else {
      router.push("/dashboard")
    }
    setShowProfileMenu(false)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('voter_active_view')
    router.push('/login')
  }

  return (
    <header className="glass fixed top-0 right-0 left-0 z-40 flex h-[72px] items-center justify-between px-6">
      {/* Left: Logo + Mobile Menu */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-muted-foreground transition-colors duration-200 hover:text-secondary lg:hidden"
          aria-label="Toggle sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          {systemLogo ? (
            <img src={systemLogo} alt="System Logo" className="h-8 w-auto rounded-md object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold tracking-tight text-primary-foreground">
                {systemName ? systemName.substring(0, 2).toUpperCase() : "VC"}
              </span>
            </div>
          )}
          <span className="text-lg font-bold tracking-widest text-foreground">
            {systemName}
          </span>
        </div>
      </div>

      {/* Center: Institution */}
      <div className="hidden text-center md:block">
        <p className="text-sm font-medium text-muted-foreground">
          {universityName}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu((v) => !v)
              setShowProfileMenu(false)
              markAllRead()
            }}
            className="group relative rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-secondary/10 hover:text-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-1 rounded-full bg-secondary text-[9px] text-secondary-foreground flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-[340px] rounded-xl border border-border/60 bg-card/95 shadow-xl backdrop-blur-md z-[120]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                <p className="text-xs font-semibold text-foreground">Notifications</p>
                <button onClick={markAllRead} className="text-[11px] text-primary hover:underline">Mark all read</button>
              </div>
              <div className="max-h-[320px] overflow-auto p-2 space-y-1">
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      {n.type === "success" && <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />}
                      {n.type === "warning" && <XCircle className="h-4 w-4 text-warning mt-0.5" />}
                      {n.type === "info" && <Clock className="h-4 w-4 text-primary mt-0.5" />}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu((v) => !v)
              setShowNotifMenu(false)
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/30"
            aria-label="Profile menu"
          >
            {userInitials}
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border/60 bg-card/95 shadow-xl backdrop-blur-md z-[120] p-2">
              <div className="px-2.5 py-2 border-b border-border/40 mb-1">
                <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userEmail || "No email"}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
