"use client"

import {
  LayoutDashboard,
  Vote,
  BarChart3,
  ShieldCheck,
  History,
  Settings,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ThemeToggle"

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "history", label: "Voting History", icon: History },
  { id: "results", label: "Results", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  activeView: string
  onChangeView: (view: string) => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ activeView, onChangeView, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "glass fixed top-0 left-0 z-50 flex h-full w-[min(80vw,300px)] sm:w-[300px] lg:top-[72px] lg:h-[calc(100vh-72px)] lg:w-[240px] flex-col transition-transform duration-300 ease-out lg:translate-x-0 rounded-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 lg:hidden">
          <span className="text-base font-semibold text-foreground">Menu</span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground touch-target flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Main navigation">
          {menuItems.map((item) => {
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id)
                  onClose()
                }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition-all duration-200 min-h-12",
                  isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(0,119,255,0.1)]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_rgba(0,119,255,0.6)]" />
                )}
                <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(0,119,255,0.8)]")} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Mobile utilities */}
        <div className="px-4 pb-2 lg:hidden">
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium text-foreground">Theme</span>
            <div className="touch-target flex items-center justify-center">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-auto px-5 pb-6">
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground/60">256-bit encrypted ballot system</p>
            <p className="text-[10px] text-muted-foreground/60">Biometric hash securely stored</p>
            <p className="text-[10px] text-muted-foreground/60">Your vote remains anonymous</p>
          </div>
        </div>
      </aside>
    </>
  )
}
