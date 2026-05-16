import AsyncStorage from '@react-native-async-storage/async-storage';
import { RunSession } from '../types';

const RUNS_KEY = 'runner_high_runs';

export async function saveRun(session: RunSession): Promise<void> {
  const existing = await loadRuns();
  const updated = [session, ...existing];
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(updated));
}

export async function loadRuns(): Promise<RunSession[]> {
  const raw = await AsyncStorage.getItem(RUNS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RunSession[];
  } catch {
    return [];
  }
}

export async function deleteRun(id: string): Promise<void> {
  const existing = await loadRuns();
  const filtered = existing.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(filtered));
}

export async function clearAllRuns(): Promise<void> {
  await AsyncStorage.removeItem(RUNS_KEY);
}

// 중간 저장: 진행 중인 세션을 임시 키에 저장
const DRAFT_KEY = 'runner_high_draft';

export async function saveDraftRun(session: Partial<RunSession>): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(session));
}

export async function loadDraftRun(): Promise<Partial<RunSession> | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<RunSession>;
  } catch {
    return null;
  }
}

export async function clearDraftRun(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}
