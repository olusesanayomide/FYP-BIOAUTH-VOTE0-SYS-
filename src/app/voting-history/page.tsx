"use client"

import { useState } from "react"
import { ParticleBackground } from "@/components/vote-core/particle-background"
import { TopNav } from "@/components/vote-core/top-nav"
import { Sidebar } from "@/components/vote-core/sidebar"
import { VotingHistory } from "@/components/vote-core/voting-history"
import { useRouter } from "next/navigation"

export default function VotingHistoryPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleChangeView = (view: string) => {
    if (view === "history") return
    localStorage.setItem("voter_active_view", view)
    router.push("/dashboard")
  }

  return (
    <div
      className="relative min-h-screen"
      style={{
        background: "radial-gradient(circle at 20% 20%, hsl(var(--background)), hsl(var(--secondary)))",
      }}
    >
      <ParticleBackground />
      <TopNav onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar
        activeView="history"
        onChangeView={handleChangeView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="relative z-10 pt-[72px] lg:pl-[240px]">
        <div className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-5 md:px-8 md:py-14 fab-safe">
          <VotingHistory />
        </div>
      </main>
    </div>
  )
}
