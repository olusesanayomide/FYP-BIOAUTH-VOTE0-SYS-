"use client"

import { useEffect, useState } from "react"
import { getElections, getVotingResults, Election } from "@/services/votingService"
import { Loader2, BarChart3, Trophy, AlertCircle } from "lucide-react"

interface ElectionResult {
  electionTitle: string;
  totalVotes: number;
  results: Array<{
    positionId: string;
    positionName: string;
    candidates: Array<{
      candidateId: string;
      candidateName: string;
      voteCount: number;
    }>;
  }>;
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
    const resp = await getVotingResults(electionId);
    if (resp.success && resp.data) {
      setResult(resp.data as ElectionResult);
    } else {
      setError(resp.error || "Results are not available yet.");
    }
    setResultLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Results</h2>
      </div>

      <div className="glass rounded-xl p-5 mb-6">
        <label className="block text-xs text-muted-foreground mb-2">Select Election</label>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedId(id);
              loadResults(id);
            }}
            className="h-10 px-3 rounded-lg bg-muted/40 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50 transition-all appearance-none"
          >
            <option value="">Choose an election</option>
            {elections.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          {selectedId && (
            <button
              onClick={() => loadResults(selectedId)}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20 transition-colors"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {resultLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading results...
        </div>
      )}

      {!resultLoading && error && (
        <div className="glass rounded-xl p-6 border border-destructive/20 bg-destructive/5 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!resultLoading && result && (
        <div className="space-y-6">
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Election</p>
              <p className="text-sm font-semibold text-foreground">{result.electionTitle}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Total Votes: <span className="text-foreground font-semibold">{result.totalVotes}</span>
            </div>
          </div>

          {result.results.map((pos) => (
            <div key={pos.positionId} className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{pos.positionName}</h3>
              </div>
              <div className="space-y-3">
                {pos.candidates.map((c) => (
                  <div key={c.candidateId} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 px-4 py-3">
                    <div className="text-sm text-foreground font-medium">{c.candidateName}</div>
                    <div className="text-xs text-muted-foreground">Votes: <span className="text-foreground font-semibold">{c.voteCount}</span></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
