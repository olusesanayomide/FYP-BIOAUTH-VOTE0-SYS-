"use client"

import { Fingerprint, Vote, CalendarDays } from "lucide-react"

export function StatusCards({
  activeElectionsCount = 0,
  registrationCompleted = false
}: {
  activeElectionsCount?: number,
  registrationCompleted?: boolean
}) {
  const cards = [
    {
      title: "Biometric Status",
      value: registrationCompleted ? "Verified" : "Pending Verification",
      icon: Fingerprint,
      color: registrationCompleted ? "text-emerald-500" : "text-amber-500",
      glow: registrationCompleted ? "shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      badgeClass: registrationCompleted ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500",
    },
    {
      title: "Voting Eligibility",
      value: registrationCompleted ? "Authorized to Vote" : "Registration Required",
      icon: Vote,
      color: registrationCompleted ? "text-emerald-500" : "text-amber-500",
      glow: registrationCompleted ? "shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
      badgeClass: registrationCompleted ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500",
    },
    {
      title: "Active Elections",
      value: `${activeElectionsCount} Ongoing Election${activeElectionsCount !== 1 ? 's' : ''}`,
      icon: CalendarDays,
      color: "text-primary",
      glow: "shadow-[0_0_12px_rgba(0,119,255,0.2)]",
      badgeClass: "bg-primary/15 text-primary",
    },
  ]

  return (
    <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="glass glass-hover group rounded-xl p-6 transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {card.title}
              </p>
              <p className={`text-sm font-semibold ${card.color}`}>
                {card.value}
              </p>
            </div>
            <div className={`rounded-lg p-2.5 ${card.badgeClass} ${card.glow} transition-shadow duration-300 group-hover:shadow-lg`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
