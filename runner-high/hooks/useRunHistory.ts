import { useState, useCallback } from 'react';
import { RunSession } from '../types';
import { loadRuns, saveRun, deleteRun } from '../services/storageService';

export function useRunHistory() {
  const [runs, setRuns] = useState<RunSession[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadRuns();
      // 최신순 정렬
      data.sort((a, b) => b.startTime - a.startTime);
      setRuns(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const addRun = useCallback(async (session: RunSession) => {
    await saveRun(session);
    await refresh();
  }, [refresh]);

  const removeRun = useCallback(async (id: string) => {
    await deleteRun(id);
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
  const totalCount = runs.length;
  const averagePace =
    runs.length > 0
      ? runs.reduce((sum, r) => sum + r.pace, 0) / runs.length
      : 0;

  return {
    runs,
    loading,
    refresh,
    addRun,
    removeRun,
    totalDistance,
    totalCount,
    averagePace,
  };
}
