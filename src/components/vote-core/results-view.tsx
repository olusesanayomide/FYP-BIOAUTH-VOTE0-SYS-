"use client"

import { useEffect, useState } from "react"
import { getElections, getVotingResults, Election } from "@/services/votingService"
import { Loader2, BarChart3, Trophy, AlertCircle, TrendingUp, CheckCircle, RefreshCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface CandidateResult {
  candidateId: string;
  candidateName: string;
  voteCount: number;
}

interface PositionResult {
  positionId: string;
  positionName: string;
  candidates: CandidateResult[];
}

interface ElectionResult {
  electionTitle: string;
  totalVotes: number;
  results: PositionResult[];
}

export function ResultsView() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [resultLoading, setResultLoading] = useState(false);
  const [result, setResult] = useState<ElectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadElections = async () => {
      const resp = await getElections();
      if (resp.success && resp.data) {
        setElections(resp.data);
      }
      setLoading(false);
    };
    loadElections();
  }, []);

  const loadResults = async (electionId: string) => {
    if (!electionId) return;
    setResultLoading(true);
    setError(null);
    setResult(null);

    // Slight artificial delay for smoother visual transition
    setTimeout(async () => {
      const resp = await getVotingResults(electionId);
      if (resp.success && resp.data) {
        setResult(resp.data as ElectionResult);
      } else {
        setError(resp.error || "Results are not available yet.");
      }
      setResultLoading(false);
    }, 400);
  };

  // Helper to calculate percentage
  const calculatePercentage = (votes: number, totalForPosition: number) => {
    if (totalForPosition === 0) return 0;
    return Math.round((votes / totalForPosition) * 100);
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up w-full max-w-5xl mx-auto">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Live Election Results</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time vote counts and candidate standings.</p>
        </div>
      </div>

      {/* Control Panel: Election Selector */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <label className="block text-sm font-medium text-foreground/80 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Select Active Election
        </label>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <select
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedId(id);
                loadResults(id);
              }}
              className="w-full h-12 px-4 rounded-xl bg-background/50 backdrop-blur-md border border-border/60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none shadow-sm cursor-pointer hover:bg-background/80"
            >
              <option value="">-- Dropdown to choose an election --</option>
              {elections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>

          <AnimatePresence>
            {selectedId && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => loadResults(selectedId)}
                disabled={resultLoading}
                className="h-12 px-6 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap group"
              >
                <RefreshCcw className={`w-4 h-4 ${resultLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                {resultLoading ? 'Syncing...' : 'Refresh Feed'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Loading State Overlay */}
      {resultLoading && !result && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Aggregating secure votes...</p>
        </div>
      )}

      {/* Error State */}
      {!resultLoading && error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-6 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-destructive">Data Unavailable</h4>
            <p className="text-xs text-destructive/80 mt-1">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Actual Results Board */}
      {!resultLoading && result && (
        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="space-y-8">

          {/* Dashboard Summary Card */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl border border-border/50 p-8 shadow-2xl"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-3 border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live Feed Active
                </span>
                <h3 className="text-2xl md:text-3xl font-bold text-foreground">{result.electionTitle}</h3>
              </div>

              <div className="flex flex-col items-start md:items-end">
                <p className="text-sm text-muted-foreground mb-1 uppercase tracking-widest font-medium">Total Turnout</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-foreground">
                    {result.totalVotes.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">votes</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Render Positions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {result.results.map((pos) => {
              // Calculate total votes for this specific position
              const totalPositionVotes = pos.candidates.reduce((sum, c) => sum + c.voteCount, 0);

              // Sort candidates by votes (highest first)
              const sortedCandidates = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
              const topVoteCount = sortedCandidates.length > 0 ? sortedCandidates[0].voteCount : 0;
              const hasVotes = totalPositionVotes > 0;

              return (
                <motion.div
                  key={pos.positionId}
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                  className="glass rounded-2xl p-6 shadow-xl border border-border/50 hover:border-primary/30 transition-colors duration-500 overflow-hidden relative group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[50px] group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none translate-x-1/2 -translate-y-1/2" />

                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background/50 border border-border/50 flex items-center justify-center shadow-inner">
                        <Trophy className="h-5 w-5 text-foreground/80" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{pos.positionName}</h3>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/30">
                      {totalPositionVotes.toLocaleString()} votes
                    </span>
                  </div>

                  <div className="space-y-5 relative z-10">
                    {sortedCandidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-xl border border-dashed border-border/40">No candidates available.</p>
                    ) : (
                      sortedCandidates.map((c, index) => {
                        const pct = calculatePercentage(c.voteCount, totalPositionVotes);
                        const isWinner = hasVotes && c.voteCount === topVoteCount && topVoteCount > 0;
                        const barColor = isWinner ? 'bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'bg-muted-foreground/30';
                        const textColor = isWinner ? 'text-foreground' : 'text-foreground/70';

                        return (
                          <div key={c.candidateId} className="relative group/cand">
                            {/* Candidate Info Line */}
                            <div className="flex items-end justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold ${textColor} transition-colors`}>{c.candidateName}</span>
                                {isWinner && (
                                  <motion.span
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 uppercase tracking-wider"
                                  >
                                    <TrendingUp className="w-3 h-3" /> Leading
                                  </motion.span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-foreground">{c.voteCount.toLocaleString()}</span>
                                <span className="text-xs font-medium text-muted-foreground ml-1">({pct}%)</span>
                              </div>
                            </div>

                            {/* Progress Bar Container */}
                            <div className="h-2.5 w-full bg-background/50 dark:bg-black/30 rounded-full overflow-hidden shadow-inner border border-border/20">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: index * 0.1 }}
                                className={`h-full rounded-full ${barColor}`}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
