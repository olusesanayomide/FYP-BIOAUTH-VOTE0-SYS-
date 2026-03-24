"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserVotingHistory } from "@/services/votingService";

const STORAGE_KEY = "voter_voted_elections";

export function useVotedElections() {
  const [votedElectionIds, setVotedElectionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const historyResp = await getUserVotingHistory();
      if (historyResp.success && historyResp.data) {
        const ids = historyResp.data.map(h => h.electionId);
        setVotedElectionIds(new Set(ids));
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        } catch { }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const cached: string[] = raw ? JSON.parse(raw) : [];
      if (cached.length > 0 && isMounted) {
        setVotedElectionIds(new Set(cached));
      }
    } catch { }

    refresh();

    return () => {
      isMounted = false;
    };
  }, [refresh]);

  return { votedElectionIds, loading, refresh };
}
