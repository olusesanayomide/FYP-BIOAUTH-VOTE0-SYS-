"use client"

import { Bell, LogOut, Menu } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getSystemSettings } from "@/services/adminService"
import { ThemeToggle } from "@/components/ThemeToggle"

interface TopNavProps {
  onToggleSidebar: () => void
}

export function TopNav({ onToggleSidebar }: TopNavProps) {
  const router = useRouter()
  const [universityName, setUniversityName] = useState("University Voting Portal")
  const [systemName, setSystemName] = useState("VOTE-CORE")
  const [systemLogo, setSystemLogo] = useState("")
  const [userInitials, setUserInitials] = useState("US")

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

    fetchSettings()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
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
        <button
          className="group relative rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-secondary/10 hover:text-secondary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-secondary" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary/30">
          {userInitials}
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
