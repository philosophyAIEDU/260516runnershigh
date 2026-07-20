import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityMode } from '../types';
import { TrackingState, createTrackingState, reduceLocation } from '../utils/tracking';
import { toCoordinate } from './locationService';

export const LOCATION_TASK_NAME = 'runner-high-location-updates';
const STATE_KEY = 'runner_high_tracking_state';

// AsyncStorage에 지속되는 추적 상태.
// 태스크(단일 writer)가 갱신하고, 앱/폴링/종료는 read만 한다.
export interface PersistedTracking extends TrackingState {
  active: boolean;
  paused: boolean;
  mode: ActivityMode;
}

async function readRaw(): Promise<PersistedTracking | null> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedTracking;
  } catch {
    return null;
  }
}

async function writeRaw(state: PersistedTracking): Promise<void> {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/**
 * 백그라운드 위치 태스크. 화면이 꺼지거나 앱이 백그라운드로 가도
 * OS가 이 콜백을 호출하며, 여기서만 거리를 누적한다(이중 계산 방지).
 */
// 웹에는 TaskManager/백그라운드 위치가 없으므로 네이티브에서만 태스크를 등록한다.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) return;
    if (!data) return;
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const state = await readRaw();
    if (!state || !state.active || state.paused) return;

    let next: PersistedTracking = state;
    for (const loc of locations) {
      const coord = toCoordinate(loc);
      next = { ...next, ...reduceLocation(next, coord, next.mode) };
    }
    await writeRaw(next);
  });
}

const UPDATE_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.LocationAccuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 1,
  activityType: Location.LocationActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: "runner's high",
    notificationBody: '활동 거리를 기록하는 중입니다',
    notificationColor: '#FF7B4F',
  },
};

async function ensureUpdatesStopped(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (started) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
  }
}

async function startUpdates(): Promise<void> {
  await ensureUpdatesStopped();
  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, UPDATE_OPTIONS);
}

// 새 세션 시작: 상태를 초기화하고 위치 업데이트를 켠다
export async function startBackgroundTracking(mode: ActivityMode): Promise<void> {
  const initial: PersistedTracking = {
    ...createTrackingState(),
    active: true,
    paused: false,
    mode,
  };
  await writeRaw(initial);
  await startUpdates();
}

// 일시정지: 업데이트를 끄고, 재개 시 정지 중 이동거리가 더해지지 않도록 기준점 초기화
export async function pauseBackgroundTracking(): Promise<void> {
  await ensureUpdatesStopped();
  const state = await readRaw();
  if (!state) return;
  await writeRaw({ ...state, paused: true, lastCoord: null });
}

// 재개: 상태 유지한 채 업데이트만 다시 켠다
export async function resumeBackgroundTracking(): Promise<void> {
  const state = await readRaw();
  if (state) {
    await writeRaw({ ...state, paused: false, active: true, lastCoord: null });
  }
  await startUpdates();
}

// 종료: 업데이트를 끄고 최종 상태를 반환한다
export async function stopBackgroundTracking(): Promise<PersistedTracking | null> {
  await ensureUpdatesStopped();
  const state = await readRaw();
  if (state) {
    await writeRaw({ ...state, active: false, paused: false });
  }
  return state;
}

// UI 폴링/복구용: 현재 지속 상태 읽기
export async function readTrackingState(): Promise<PersistedTracking | null> {
  return readRaw();
}

// 세션 종료 후 지속 상태 정리
export async function clearTrackingState(): Promise<void> {
  await AsyncStorage.removeItem(STATE_KEY);
}
