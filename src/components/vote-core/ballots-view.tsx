"use client"

import { useEffect, useState } from "react"
import { Calendar, Building2, ArrowRight, Loader2 } from "lucide-react"
import { getElections, Election } from "@/services/votingService"
import { getCurrentUser } from "@/services/authService"
import { format } from "date-fns"
import { ElectionCard } from "./election-card"
import { useVotedElections } from "@/hooks/useVotedElections"

const statusConfig = {
  active: {
    label: "Ongoing",
    className: "bg-success/15 text-success",
    dotClass: "bg-success",
    pulse: true,
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-primary/15 text-primary",
    dotClass: "bg-primary",
    pulse: false,
  },
  completed: {
    label: "Completed",
    className: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
    pulse: false,
  },
}

export function BallotsView() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { votedElectionIds } = useVotedElections();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { }
    }
    const loadData = async () => {
      const [electionsResp, userResp] = await Promise.all([
        getElections(),
        getCurrentUser()
      ]);
      if (electionsResp.success && electionsResp.data) {
        setElections(electionsResp.data);
      }
      if (userResp.success && userResp.data) {
        setUser(userResp.data);
        localStorage.setItem('user', JSON.stringify(userResp.data));
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const formatDateRange = (election: Election) => {
    try {
      const start = format(new Date(election.startDate), "MMM d");
      const end = format(new Date(election.endDate), "MMM d, yyyy");
      return `${start} - ${end}`;
    } catch {
      return "Dates TBD";
    }
  }

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="mb-6 text-lg font-semibold text-foreground">My Ballots</h2>

      {elections.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-xl p-8 py-16 text-center">
          <p className="text-base font-medium text-foreground">No ballots found.</p>
          <p className="mt-2 text-sm text-muted-foreground">There are currently no active or upcoming elections.</p>
        </div>
      ) : (
        <div className="stagger-children space-y-4">
          {elections.map((ballot) => (
            <ElectionCard
              key={ballot.id}
              election={ballot}
              isVerified={user?.registrationCompleted ?? user?.registration_completed}
              initialHasVoted={votedElectionIds.has(ballot.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
