"use client"

import { useEffect, useState } from "react"
import { ParticleBackground } from "@/components/vote-core/particle-background"
import { TopNav } from "@/components/vote-core/top-nav"
import { Sidebar } from "@/components/vote-core/sidebar"
import { DashboardContent } from "@/components/vote-core/dashboard-content"
import { BallotsView } from "@/components/vote-core/ballots-view"
import { VerificationStatus } from "@/components/vote-core/verification-status"
import { VotingHistory } from "@/components/vote-core/voting-history"
import { ResultsView } from "@/components/vote-core/results-view"
import { SettingsView } from "@/components/vote-core/settings-view"
import { Loader2 } from "lucide-react"
import { useVoterSessionGuard } from "@/hooks/useVoterSessionGuard"

export default function VoterDashboard() {
  const [activeView, setActiveView] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { authChecking, isAuthorized } = useVoterSessionGuard()

  useEffect(() => {
    if (!isAuthorized) return

    const savedView = localStorage.getItem("voter_active_view")
    if (savedView && ["dashboard", "ballots", "verification", "results", "history", "settings"].includes(savedView)) {
      setActiveView(savedView)
      localStorage.removeItem("voter_active_view")
    }

    const onSetActiveView = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (detail && ["dashboard", "ballots", "verification", "results", "history", "settings"].includes(detail)) {
        setActiveView(detail)
      }
    }

    window.addEventListener("voter:set-active-view", onSetActiveView)
    return () => window.removeEventListener("voter:set-active-view", onSetActiveView)
  }, [isAuthorized])

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthorized) return null

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardContent />
      case "ballots":
        return <BallotsView />
      case "verification":
        return <VerificationStatus />
      case "results":
        return <ResultsView />
      case "history":
        return <VotingHistory />
      case "settings":
        return <SettingsView />
      default:
        return <DashboardContent />
    }
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: "radial-gradient(circle at 20% 20%, hsl(var(--background)), hsl(var(--secondary)))",
      }}
    >
      {/* Subtle particle effect */}
      <ParticleBackground />

      {/* Top Navigation */}
      <TopNav onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="relative z-10 pt-[72px] lg:pl-[240px]">
        <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-14">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
