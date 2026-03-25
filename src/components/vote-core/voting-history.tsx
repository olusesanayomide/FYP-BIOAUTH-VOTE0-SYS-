"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { getUserVotingHistory, VotingHistoryEntry } from "@/services/votingService"
import { format } from "date-fns"

export function VotingHistory() {
  const [historyItems, setHistoryItems] = useState<VotingHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const loadData = async () => {
      const resp = await getUserVotingHistory();
      if (resp.success && resp.data) {
        setHistoryItems(resp.data);
      }
      setLoading(false);
    };
    loadData();
  }, [])

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="mb-6 text-lg font-semibold text-foreground">
        Voting History
      </h2>

      <div className="stagger-children space-y-3">
        {historyItems.map((item) => {
          const isExpanded = expandedId === item.electionId;

          return (
            <div key={item.electionId} className="glass overflow-hidden rounded-xl transition-all duration-300">
              <div
                onClick={() => toggleExpand(item.electionId)}
                className="flex cursor-pointer items-center justify-between px-6 py-5 hover:bg-muted/10 min-h-12"
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.electionTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.votedAt), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Completed
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Vote Recorded</span>
                  </span>
                  <div className="ml-2 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Expansion Panel for Selections */}
              {isExpanded && item.selections && item.selections.length > 0 && (
                <div className="border-t border-border/50 bg-secondary/5 px-6 py-4 animate-fade-in">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Selections</h4>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {item.selections.map((sel, idx) => (
                      <li key={idx} className="rounded-lg border border-border/40 bg-background/50 p-3 shadow-sm">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium mb-1">{sel.positionTitle}</p>
                        <p className="text-sm font-semibold text-primary">{sel.candidateName}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {historyItems.length === 0 && (
        <div className="glass flex flex-col items-center rounded-xl py-16 text-center">
          <p className="text-base font-medium text-foreground">No voting history yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your participation records will appear here after you cast your first vote.
          </p>
        </div>
      )}
    </div>
  )
}
