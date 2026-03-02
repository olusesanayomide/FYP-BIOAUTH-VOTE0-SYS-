"use client"

import { Calendar, Building2, ArrowRight, CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react"
import { Election, submitVote } from "@/services/votingService"
import { format } from "date-fns"
import { useState, useEffect } from "react"

export interface ElectionCardProps {
  election: Election;
  isVerified?: boolean;
  institutionName?: string;
}

export function ElectionCard({ election, isVerified = false, institutionName = "University Voting Portal" }: ElectionCardProps) {
  const [isOngoing, setIsOngoing] = useState(false);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const isBiometricRequired = election.require_biometrics ?? false;
  const canVote = isVerified || !isBiometricRequired;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const startDate = new Date(election.startDate);
      const endDate = new Date(election.endDate);

      const ongoing = now >= startDate && now <= endDate && election.status !== "suspended";
      const upcoming = now < startDate && election.status !== "suspended";

      setIsOngoing(ongoing);
      setIsUpcoming(upcoming);

      if (ongoing || upcoming) {
        const targetDate = ongoing ? endDate : startDate;
        const distance = targetDate.getTime() - now.getTime();

        if (distance <= 0) {
          setTimeLeft("");
          return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const timeStr = days > 0
          ? `${days}d ${hours}h ${minutes}m`
          : `${hours}h ${minutes}m ${seconds}s`;

        setTimeLeft(timeStr);
      } else {
        setTimeLeft("");
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [election]);

  const [isVoting, setIsVoting] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formatDateRange = () => {
    try {
      const start = format(new Date(election.startDate), "MMM d");
      const end = format(new Date(election.endDate), "MMM d, yyyy");
      return `${start} - ${end}`;
    } catch {
      return "Dates TBD";
    }
  }

  const handleSelectCandidate = (positionId: string, candidateId: string) => {
    setSelectedCandidates(prev => {
      // If already selected, unselect
      if (prev[positionId] === candidateId) {
        const newState = { ...prev };
        delete newState[positionId];
        return newState;
      }
      // Otherwise, select
      return {
        ...prev,
        [positionId]: candidateId
      };
    });
  };

  const handleSubmitVote = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      // Get auth token and user
      const storedUser = localStorage.getItem("user");
      let currentUser: any = null;
      if (storedUser) {
        currentUser = JSON.parse(storedUser);
      }

      // Convert local state back into the array shape required by API
      const votesArray = Object.entries(selectedCandidates).map(([posId, candId]) => ({
        positionId: posId,
        candidateId: candId
      }));

      let submission: any = {
        electionId: election.id,
        votes: votesArray,
      };

      if (isBiometricRequired) {
        // Re-trigger biometric before submitting
        const { getWebAuthnAuthenticationOptions } = await import('@/services/authService');
        const authOptions = await getWebAuthnAuthenticationOptions(currentUser?.email || currentUser?.matricNumber);

        if (!authOptions.success || !authOptions.data) {
          setSubmitError("Failed to initialize secure verification. Please try again.");
          setIsSubmitting(false);
          return;
        }

        const { startAuthentication } = await import('@simplewebauthn/browser');
        let attResp;
        try {
          attResp = await startAuthentication({ optionsJSON: authOptions.data as any });
        } catch (error: any) {
          setSubmitError("Biometric verification was cancelled or failed.");
          setIsSubmitting(false);
          return;
        }

        submission.webauthnVerificationProof = {
          assertionObject: JSON.stringify(attResp),
          clientDataJSON: "" // Backend will unpack assertionObject
        };
      }

      const result = await submitVote(submission);
      if (result.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.error || "Failed to submit vote. You may have already voted.");
      }
    } catch (e: any) {
      setSubmitError(e.message || "An unexpected error occurred while submitting.");
    }

    setIsSubmitting(false);
  };

  return (
    <section className="animate-fade-in-up w-full">
      <div className="bg-card border border-border/20 rounded-2xl overflow-hidden shadow-lg transition-all duration-300">
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">

          {/* Left content */}
          <div className="space-y-4 max-w-2xl flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {election.title}
              </h3>
              {election.status === "suspended" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive border border-destructive/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  Suspended
                </span>
              ) : isOngoing ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ongoing
                  </span>
                  {timeLeft && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400/90 bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
                      <Clock className="w-3.5 h-3.5" />
                      Ends in: {timeLeft}
                    </span>
                  )}
                </div>
              ) : isUpcoming ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-400 border border-blue-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    Upcoming
                  </span>
                  {timeLeft && (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-blue-400/90 bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/10">
                      <Clock className="w-3.5 h-3.5" />
                      Starts in: {timeLeft}
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-3 py-1 text-sm font-medium text-zinc-400 border border-zinc-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              )}
            </div>

            <p className="text-[15px] leading-relaxed text-slate-300 max-w-[90%]">
              {election.description || "Cast your vote in this important election. Your voice matters in shaping the future of student governance."}
            </p>

            <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-slate-400 pt-2">
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-500/70" />
                {institutionName}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500/70" />
                {formatDateRange()}
              </span>
            </div>
          </div>

          {/* Right CTA */}
          {isOngoing && !isVoting && !submitSuccess ? (
            canVote ? (
              <button
                onClick={() => setIsVoting(true)}
                className="group flex items-center justify-center gap-4 rounded-2xl bg-[#8b5cf6] px-8 py-5 text-base font-semibold text-white transition-all hover:bg-[#7c3aed] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] shadow-md flex-shrink-0"
              >
                <div className="flex flex-col items-center leading-snug text-left">
                  <span>Cast Your</span>
                  <span>Vote</span>
                </div>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                disabled
                className="group flex flex-col items-center justify-center gap-1 rounded-2xl bg-muted/60 px-8 py-4 font-semibold text-muted-foreground cursor-not-allowed border border-border/50 flex-shrink-0"
                title="Biometric Verification Required"
              >
                <span className="flex items-center gap-2 text-sm">
                  Verification Required
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400/20 text-amber-500">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </span>
                </span>
              </button>
            )
          ) : (!isOngoing && !isUpcoming) ? (
            <button
              disabled
              className="px-6 py-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 text-zinc-400 font-medium cursor-not-allowed flex items-center gap-2 flex-shrink-0 transition-opacity"
            >
              Voting Concluded
            </button>
          ) : null}
        </div>

        {/* Voting Expansion Panel */}
        {isVoting && !submitSuccess && (
          <div className="border-t border-border/40 bg-[#161b22]/50 p-6 md:p-8 animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Official Ballot</h3>
              <button
                onClick={() => setIsVoting(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>

            {submitError && (
              <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex gap-3 items-center">
                <AlertCircle className="h-5 w-5 text-destructive font-medium" />
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            {!election.positions || election.positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted/40 flex items-center justify-center mb-4 border border-border/50">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-1">Ballot Not Finalized</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                  There are currently no candidates listed for this election. Please check back later or contact administration.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-8">
                  {election.positions?.map((pos) => {
                    const isAnswered = !!selectedCandidates[pos.id];

                    return (
                      <div key={pos.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-semibold text-foreground">{pos.title}</h4>
                          {!isAnswered && (
                            <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">Required</span>
                          )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {pos.candidates.map((cand) => {
                            const isSelected = selectedCandidates[pos.id] === cand.id;
                            return (
                              <button
                                key={cand.id}
                                onClick={() => handleSelectCandidate(pos.id, cand.id)}
                                className={`group relative flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-200 text-left ${isSelected
                                  ? "border-[#8b5cf6] bg-[#8b5cf6]/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                                  : "border-border/40 bg-card hover:border-[#8b5cf6]/50 hover:bg-[#8b5cf6]/5"
                                  }`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <div className={`mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#8b5cf6] bg-[#8b5cf6]' : 'border-muted-foreground/40'}`}>
                                    {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                                  </div>
                                  {cand.imageUrl ? (
                                    <img src={cand.imageUrl} alt={cand.name} className="w-14 h-14 rounded-full object-cover border-2 border-border/50" />
                                  ) : (
                                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-border/50">
                                      <span className="text-xl font-bold text-muted-foreground">{cand.name.charAt(0)}</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className={`font-bold text-lg leading-tight mb-2 ${isSelected ? 'text-[#8b5cf6]' : 'text-foreground'}`}>{cand.name}</p>
                                  {cand.platform ? (
                                    <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">{cand.platform}</p>
                                  ) : (
                                    <p className="text-sm text-slate-500 italic">No manifesto provided.</p>
                                  )}
                                  <a
                                    href={`/dashboard/candidate/${cand.id}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="inline-flex mt-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                  >
                                    View Full Profile &rarr;
                                  </a>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-10 flex justify-end">
                  <button
                    onClick={handleSubmitVote}
                    disabled={isSubmitting || Object.keys(selectedCandidates).length !== (election.positions?.length || 0)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-10 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isBiometricRequired ? "Verifying Biometrics & Submitting..." : "Submitting securely..."}
                      </>
                    ) : (
                      isBiometricRequired ? "Sign Ballot & Submit" : "Submit Ballot"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Success State */}
        {submitSuccess && (
          <div className="border-t border-border/50 bg-success/5 p-8 text-center animate-fade-in">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/20 text-success shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-foreground">Ballot Successfully Cast</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your biometric signature was verified and your vote has been securely recorded on the encrypted ledger.
            </p>
          </div>
        )}
      </div>
    </section >
  )
}

export function NoElectionState() {
  return (
    <section className="animate-fade-in-up">
      <h2 className="mb-5 text-lg font-semibold text-foreground">
        Current Elections
      </h2>

      <div className="glass flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
        {/* Minimal line art illustration */}
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border">
          <svg
            className="h-10 w-10 text-muted-foreground/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-base font-medium text-foreground">
          There are currently no active elections.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be notified when voting opens.
        </p>
      </div>
    </section>
  )
}
