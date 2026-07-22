import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Location from 'expo-location';
import { RunState, Coordinate, RunSession, ActivityMode } from '../types';
import {
  requestLocationPermission,
  requestBackgroundPermission,
  toCoordinate,
} from '../services/locationService';
import { calculatePace, calculateAverageSpeed, estimateSteps } from '../utils/calculations';
import { TrackingState, createTrackingState, reduceLocation } from '../utils/tracking';
import { saveDraftRun, clearDraftRun } from '../services/storageService';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
  clearTrackingState,
} from '../services/backgroundLocationService';

const IS_NATIVE = Platform.OS !== 'web';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 추적 방식: 앱이 켜져 있는 동안은 항상 검증된 포그라운드 GPS
 * (watchPositionAsync)를 단일 진실 소스로 사용한다. 앱이 실제로
 * 백그라운드로 전환될 때만(AppState) 네이티브 백그라운드 태스크로
 * 잠깐 넘어가고, 포그라운드로 돌아오면 그 결과를 병합한 뒤 다시
 * 포그라운드 GPS로 복귀한다. 이렇게 하면 일반적인 사용(앱을 켠 채
 * 뛰는 경우)에서는 항상 기존에 검증된 경로를 타므로 기록이 확실히
 * 남고, 화면 잠금/백그라운드 전환 시에만 추가로 이어서 기록된다.
 */
export function useRunTracking() {
  const [runState, setRunState] = useState<RunState>('IDLE');
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [gpsWeak, setGpsWeak] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [mode, setMode] = useState<ActivityMode>('running');

  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>('');
  const modeRef = useRef<ActivityMode>('running');
  const runStateRef = useRef<RunState>('IDLE');

  // 추적 상태의 단일 진실 소스 (포그라운드 콜백과 백그라운드 병합 모두 이걸 갱신)
  const trackingRef = useRef<TrackingState>(createTrackingState());
  const foregroundSubRef = useRef<Location.LocationSubscription | null>(null);
  // 이번 세션 중 실제로 네이티브 백그라운드 태스크로 넘어간 적이 있는지
  const usingNativeBackgroundRef = useRef<boolean>(false);
  const appStateSubRef = useRef<{ remove: () => void } | null>(null);

  const elapsedSeconds = useCallback(() => {
    return (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
  }, []);

  const applyTracking = useCallback(
    (ts: TrackingState) => {
      setDistance(ts.distance);
      setCoordinates(ts.coordinates);
      setCurrentSpeed(ts.currentSpeed);
      setGpsWeak(ts.gpsWeak);
      const elapsed = elapsedSeconds();
      if (elapsed > 0) {
        setPace(calculatePace(ts.distance, elapsed));
        setAverageSpeed(calculateAverageSpeed(ts.distance, elapsed));
      }
    },
    [elapsedSeconds]
  );

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setDuration(Math.floor(Math.max(0, elapsedSeconds())));
    }, 1000);
  }, [elapsedSeconds]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startForegroundWatch = useCallback(async () => {
    foregroundSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.LocationAccuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const coord = toCoordinate(loc);
        trackingRef.current = reduceLocation(trackingRef.current, coord, modeRef.current);
        applyTracking(trackingRef.current);
      }
    );
  }, [applyTracking]);

  const stopForegroundWatch = useCallback(() => {
    foregroundSubRef.current?.remove();
    foregroundSubRef.current = null;
  }, []);

  const startDraftSave = useCallback(() => {
    draftTimerRef.current = setInterval(async () => {
      await saveDraftRun({
        id: sessionIdRef.current,
        startTime: startTimeRef.current,
        distance: trackingRef.current.distance,
        duration: Math.floor(Math.max(0, elapsedSeconds())),
        coordinates: trackingRef.current.coordinates,
      });
    }, 60000);
  }, [elapsedSeconds]);

  const stopDraftSave = useCallback(() => {
    if (draftTimerRef.current) {
      clearInterval(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  // 앱이 실제로 백그라운드로 전환될 때: 포그라운드 감시를 멈추고
  // 지금까지의 상태를 이어받아 네이티브 백그라운드 태스크를 시작한다.
  // 실패해도(Expo Go, 권한 거부 등) 무시한다 — 포그라운드 복귀 시
  // 그냥 지금까지 쌓인 거리 그대로 이어서 추적을 재개한다.
  const handleGoBackground = useCallback(async () => {
    if (!IS_NATIVE) return;
    if (runStateRef.current !== 'RUNNING') return;
    stopForegroundWatch();
    try {
      await startBackgroundTracking(modeRef.current, trackingRef.current);
      usingNativeBackgroundRef.current = true;
    } catch (e) {
      console.warn('백그라운드 위치 추적 전환 실패:', e);
      usingNativeBackgroundRef.current = false;
    }
  }, [stopForegroundWatch]);

  // 포그라운드로 복귀할 때: 백그라운드 태스크가 쌓아둔 최종 상태를
  // 병합하고, 다시 포그라운드 GPS 감시로 돌아간다.
  const handleGoForeground = useCallback(async () => {
    if (!IS_NATIVE) return;
    if (usingNativeBackgroundRef.current) {
      const finalState = await stopBackgroundTracking();
      if (finalState) {
        trackingRef.current = finalState;
        applyTracking(finalState);
      }
      usingNativeBackgroundRef.current = false;
    }
    if (runStateRef.current === 'RUNNING' && !foregroundSubRef.current) {
      try {
        await startForegroundWatch();
      } catch (e) {
        console.error('포그라운드 위치 추적 재개 실패:', e);
      }
    }
  }, [applyTracking, startForegroundWatch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        handleGoForeground();
      } else if (next === 'background') {
        handleGoBackground();
      }
    });
    appStateSubRef.current = sub;
    return () => sub.remove();
  }, [handleGoBackground, handleGoForeground]);

  const start = useCallback(
    async (activityMode: ActivityMode = 'running') => {
      const permitted = await requestLocationPermission();
      if (!permitted) return false;
      // 화면 잠금/백그라운드에서도 기록되도록 백그라운드 권한 요청(거부돼도 진행)
      if (IS_NATIVE) {
        await requestBackgroundPermission().catch(() => false);
        await clearTrackingState();
      }

      sessionIdRef.current = generateId();
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      pauseStartRef.current = 0;
      isPausedRef.current = false;
      modeRef.current = activityMode;
      trackingRef.current = createTrackingState();
      usingNativeBackgroundRef.current = false;

      setMode(activityMode);
      setDuration(0);
      setDistance(0);
      setPace(0);
      setAverageSpeed(0);
      setCurrentSpeed(0);
      setCoordinates([]);
      setGpsWeak(false);

      setRunState('RUNNING');
      runStateRef.current = 'RUNNING';
      startTimer();

      try {
        await startForegroundWatch();
      } catch (e) {
        console.error('위치 추적 시작 실패:', e);
        stopTimer();
        setRunState('IDLE');
        runStateRef.current = 'IDLE';
        return false;
      }

      startDraftSave();
      return true;
    },
    [startTimer, stopTimer, startForegroundWatch, startDraftSave]
  );

  const pause = useCallback(() => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    setRunState('PAUSED');
    runStateRef.current = 'PAUSED';
    stopTimer();
    stopForegroundWatch();
    // 재개 시 정지 중 이동거리가 더해지지 않도록 기준점 초기화
    trackingRef.current = { ...trackingRef.current, lastCoord: null };
  }, [stopTimer, stopForegroundWatch]);

  const resume = useCallback(async () => {
    isPausedRef.current = false;
    pausedDurationRef.current += (Date.now() - pauseStartRef.current) / 1000;
    setRunState('RUNNING');
    runStateRef.current = 'RUNNING';
    startTimer();
    await startForegroundWatch();
  }, [startTimer, startForegroundWatch]);

  const finish = useCallback(async (): Promise<RunSession | null> => {
    stopTimer();
    stopDraftSave();
    runStateRef.current = 'FINISHED';

    // 만약 화면이 꺼진 채로 종료된 경우를 대비해 백그라운드 상태를 병합
    if (usingNativeBackgroundRef.current) {
      const finalState = await stopBackgroundTracking();
      if (finalState) trackingRef.current = finalState;
      usingNativeBackgroundRef.current = false;
    }
    stopForegroundWatch();
    clearDraftRun();
    if (IS_NATIVE) await clearTrackingState();

    const endTime = Date.now();
    // 일시정지 중 종료 시 현재 정지 구간도 총 정지시간에 포함
    const currentPauseDuration =
      isPausedRef.current && pauseStartRef.current > 0
        ? (endTime - pauseStartRef.current) / 1000
        : 0;
    const totalPaused = pausedDurationRef.current + currentPauseDuration;
    const elapsed = (endTime - startTimeRef.current) / 1000 - totalPaused;

    isPausedRef.current = false;

    if (startTimeRef.current === 0) {
      setRunState('IDLE');
      return null;
    }

    const currentMode = modeRef.current;
    const safeDuration = Math.max(0, Math.floor(elapsed));
    const finalDistance = trackingRef.current.distance;
    const finalCoords = trackingRef.current.coordinates;
    const finalZones = trackingRef.current.cyclingZones;

    const session: RunSession = {
      id: sessionIdRef.current,
      startTime: startTimeRef.current,
      endTime,
      duration: safeDuration,
      distance: finalDistance,
      pace: calculatePace(finalDistance, safeDuration),
      averageSpeed: calculateAverageSpeed(finalDistance, safeDuration),
      coordinates: finalCoords,
      mode: currentMode,
      steps:
        currentMode !== 'cycling'
          ? estimateSteps(finalDistance, currentMode === 'walking' ? 'walking' : 'running')
          : undefined,
      cyclingZones: currentMode === 'cycling' ? { ...finalZones } : undefined,
    };

    setRunState('FINISHED');
    return session;
  }, [stopTimer, stopDraftSave, stopForegroundWatch]);

  const reset = useCallback(() => {
    setRunState('IDLE');
    runStateRef.current = 'IDLE';
    setDuration(0);
    setDistance(0);
    setPace(0);
    setAverageSpeed(0);
    setCurrentSpeed(0);
    setCoordinates([]);
    setGpsWeak(false);
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      stopDraftSave();
      stopForegroundWatch();
    };
  }, [stopTimer, stopDraftSave, stopForegroundWatch]);

  return {
    runState,
    duration,
    distance,
    pace,
    averageSpeed,
    currentSpeed,
    gpsWeak,
    coordinates,
    mode,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
