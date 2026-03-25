"use client"

import { useEffect, useState } from "react"
import { StatusCards } from "./status-cards"
import { ElectionCard, NoElectionState } from "./election-card"
import { getElections, Election } from "@/services/votingService"
import { getSystemSettings } from "@/services/adminService"
import { getCurrentUser } from "@/services/authService"
import { Loader2, AlertCircle, RefreshCw, ChevronRight } from "lucide-react"
import { useVotedElections } from "@/hooks/useVotedElections"

export function DashboardContent() {
  const [user, setUser] = useState<{
    name?: string,
    registration_completed?: boolean,
    biometricStatus?: string
  } | null>(null);
  const [universityName, setUniversityName] = useState("University Voting Portal");
  const [ongoingElections, setOngoingElections] = useState<Election[]>([]);
  const [upcomingElections, setUpcomingElections] = useState<Election[]>([]);
  const [completedElections, setCompletedElections] = useState<Election[]>([]);
  const { votedElectionIds } = useVotedElections();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch fresh user data
      const userResp = await getCurrentUser();
      if (userResp.success && userResp.data) {
        setUser(userResp.data);
        localStorage.setItem('user', JSON.stringify(userResp.data));
      }

      const resp = await getElections();

      try {
        const sysResp = await getSystemSettings();
        if (sysResp.success && sysResp.data) {
          const uniKey = sysResp.data.find((s: any) => s.key === 'UNIVERSITY_NAME');
          if (uniKey) setUniversityName(uniKey.value);
        }
      } catch (e) { }

      console.log('[DashboardContent] getElections response:', resp);

      if (resp.success && resp.data) {
        const now = new Date();
        const allElections = resp.data;
        console.log(`[DashboardContent] Received ${allElections.length} elections`);

        // Show all elections including suspended ones as part of "every instance" requirement
        const validElections = allElections;

        const ongoing = validElections.filter(e => {
          if (!e.startDate || !e.endDate) return false;
          const start = new Date(e.startDate);
          const end = new Date(e.endDate);
          const valid = !isNaN(start.getTime()) && !isNaN(end.getTime());
          return valid && now >= start && now <= end;
        });

        const upcoming = validElections.filter(e => {
          if (!e.startDate) return false;
          const start = new Date(e.startDate);
          return !isNaN(start.getTime()) && now < start;
        });

        const completed = validElections.filter(e => {
          if (!e.endDate) return false;
          const end = new Date(e.endDate);
          return !isNaN(end.getTime()) && now > end;
        });

        console.log(`[DashboardContent] ongoing:${ongoing.length} upcoming:${upcoming.length} completed:${completed.length}`);
        setOngoingElections(ongoing);
        setUpcomingElections(upcoming);
        setCompletedElections(completed);
      } else {
        console.error('[DashboardContent] Error from API:', resp.error);
        setError(resp.error || 'Failed to load elections. Please try again.');
      }
    } catch (err: any) {
      console.error('[DashboardContent] Exception:', err);
      setError('A network error occurred. Is the backend server running?');
    }

    setLoading(false);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) { }
    }
    loadData();
  }, [])

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-[40vh] items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium text-center max-w-sm">{error}</p>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors min-h-12"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  const hasElections = ongoingElections.length > 0 || upcomingElections.length > 0 || completedElections.length > 0;

  return (
    <div className="space-y-10">
      {/* Welcome Section */}
      <div className="animate-fade-in-up">
        <h1 className="text-[clamp(1.75rem,4.2vw,2.5rem)] font-bold tracking-tight text-foreground text-balance">
          Welcome back, {user?.name?.split(' ')[0] || "Voter"}.
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {user?.biometricStatus === 'VERIFIED'
            ? "Your identity is verified. You can now securely participate in all active elections."
            : "Welcome to the portal. Please complete your one-time biometric enrollment to begin voting."}
        </p>
      </div>

      {/* Status Cards */}
      <StatusCards
        activeElectionsCount={ongoingElections.length}
        registrationCompleted={user?.biometricStatus === 'VERIFIED'}
      />

      {/* Elections Sections */}
      {!hasElections ? (
        <NoElectionState />
      ) : (
        <div className="space-y-12">
          {ongoingElections.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">Ongoing Elections</h2>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="grid gap-6">
                {ongoingElections.slice(0, 2).map(election => (
                  <ElectionCard key={election.id} election={election} isVerified={user?.biometricStatus === 'VERIFIED'} institutionName={universityName} initialHasVoted={votedElectionIds.has(election.id)} />
                ))}
                {ongoingElections.length > 2 && (
                  <button
                    onClick={() => {
                      localStorage.setItem("voter_active_view", "ballots");
                      window.dispatchEvent(new CustomEvent("voter:set-active-view", { detail: "ballots" }));
                    }}
                    className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    View all ballots <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </section>
          )}

          {upcomingElections.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Upcoming Elections</h2>
              <div className="grid gap-6">
                {upcomingElections.slice(0, 2).map(election => (
                  <ElectionCard key={election.id} election={election} isVerified={user?.biometricStatus === 'VERIFIED'} institutionName={universityName} initialHasVoted={votedElectionIds.has(election.id)} />
                ))}
                {upcomingElections.length > 2 && (
                  <button
                    onClick={() => {
                      localStorage.setItem("voter_active_view", "ballots");
                      window.dispatchEvent(new CustomEvent("voter:set-active-view", { detail: "ballots" }));
                    }}
                    className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    View all ballots <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </section>
          )}

          {completedElections.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-muted-foreground leading-tight">Completed Elections</h2>
              <div className="grid gap-4 sm:gap-6 opacity-80">
                {completedElections.slice(0, 2).map(election => (
                  <ElectionCard key={election.id} election={election} isVerified={user?.biometricStatus === 'VERIFIED'} institutionName={universityName} initialHasVoted={votedElectionIds.has(election.id)} />
                ))}
                {completedElections.length > 2 && (
                  <button
                    onClick={() => {
                      localStorage.setItem("voter_active_view", "ballots");
                      window.dispatchEvent(new CustomEvent("voter:set-active-view", { detail: "ballots" }));
                    }}
                    className="mt-4 inline-flex items-center justify-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    View all ballots <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
