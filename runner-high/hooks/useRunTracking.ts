import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
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
  pauseBackgroundTracking,
  resumeBackgroundTracking,
  stopBackgroundTracking,
  readTrackingState,
  clearTrackingState,
} from '../services/backgroundLocationService';

const IS_NATIVE = Platform.OS !== 'web';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>('');
  const modeRef = useRef<ActivityMode>('running');
  // 이번 세션이 실제로 백그라운드 태스크로 도는지 여부.
  // 네이티브라도 Expo Go 등 백그라운드 미지원 환경이면 false로 남아
  // 포그라운드 watchPositionAsync로 폴백한다.
  const usingBackgroundRef = useRef<boolean>(false);

  // 포그라운드 watchPositionAsync 경로용 인메모리 상태 + 구독
  // (웹 전용, 그리고 네이티브에서 백그라운드 시작 실패 시 폴백으로도 사용)
  const foregroundTrackingRef = useRef<TrackingState>(createTrackingState());
  const foregroundSubRef = useRef<Location.LocationSubscription | null>(null);

  const elapsedSeconds = useCallback(() => {
    return (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
  }, []);

  // TrackingState → React state 반영 (거리/좌표/속도/페이스)
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

  // 네이티브: 지속 상태를 주기적으로 읽어 UI 갱신
  const startPoll = useCallback(() => {
    pollRef.current = setInterval(async () => {
      const s = await readTrackingState();
      if (s) applyTracking(s);
    }, 1000);
  }, [applyTracking]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // 포그라운드 위치 구독. 웹의 기본 경로이자, 네이티브에서 백그라운드
  // 태스크 시작이 실패했을 때(Expo Go, 권한 거부 등) 쓰는 폴백 경로.
  const startForegroundWatch = useCallback(async () => {
    foregroundSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.LocationAccuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const coord = toCoordinate(loc);
        foregroundTrackingRef.current = reduceLocation(
          foregroundTrackingRef.current,
          coord,
          modeRef.current
        );
        applyTracking(foregroundTrackingRef.current);
      }
    );
  }, [applyTracking]);

  const stopForegroundWatch = useCallback(() => {
    foregroundSubRef.current?.remove();
    foregroundSubRef.current = null;
  }, []);

  const startDraftSave = useCallback(() => {
    draftTimerRef.current = setInterval(async () => {
      const ts = usingBackgroundRef.current
        ? await readTrackingState()
        : foregroundTrackingRef.current;
      await saveDraftRun({
        id: sessionIdRef.current,
        startTime: startTimeRef.current,
        distance: ts?.distance ?? 0,
        duration: Math.floor(Math.max(0, elapsedSeconds())),
        coordinates: ts?.coordinates ?? [],
      });
    }, 60000);
  }, [elapsedSeconds]);

  const stopDraftSave = useCallback(() => {
    if (draftTimerRef.current) {
      clearInterval(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (activityMode: ActivityMode = 'running') => {
      const permitted = await requestLocationPermission();
      if (!permitted) return false;
      // 화면 잠금/백그라운드에서도 기록되도록 백그라운드 권한 요청(거부돼도 진행)
      if (IS_NATIVE) {
        await requestBackgroundPermission().catch(() => false);
      }

      sessionIdRef.current = generateId();
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      pauseStartRef.current = 0;
      isPausedRef.current = false;
      modeRef.current = activityMode;
      foregroundTrackingRef.current = createTrackingState();
      usingBackgroundRef.current = false;

      setMode(activityMode);
      setDuration(0);
      setDistance(0);
      setPace(0);
      setAverageSpeed(0);
      setCurrentSpeed(0);
      setCoordinates([]);
      setGpsWeak(false);

      setRunState('RUNNING');
      startTimer();

      // 백그라운드 추적을 우선 시도하고(네이티브), 안 되면(Expo Go, 권한
      // 거부 등) 조용히 포그라운드 GPS로 폴백한다 — 이 시작 단계에서
      // 실패해 전체 기록이 중단되는 일이 없도록 한다.
      let started = false;
      if (IS_NATIVE) {
        try {
          await startBackgroundTracking(activityMode);
          usingBackgroundRef.current = true;
          startPoll();
          started = true;
        } catch (e) {
          console.warn('백그라운드 위치 추적 시작 실패, 포그라운드로 대체합니다:', e);
        }
      }

      if (!started) {
        try {
          await startForegroundWatch();
          started = true;
        } catch (e) {
          console.error('위치 추적 시작 실패:', e);
        }
      }

      if (!started) {
        stopTimer();
        setRunState('IDLE');
        return false;
      }

      startDraftSave();
      return true;
    },
    [startTimer, stopTimer, startPoll, startForegroundWatch, startDraftSave]
  );

  const pause = useCallback(async () => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    setRunState('PAUSED');
    stopTimer();
    if (usingBackgroundRef.current) {
      stopPoll();
      await pauseBackgroundTracking();
    } else {
      stopForegroundWatch();
      // 재개 시 정지 중 이동거리가 더해지지 않도록 기준점 초기화
      foregroundTrackingRef.current = { ...foregroundTrackingRef.current, lastCoord: null };
    }
  }, [stopTimer, stopPoll, stopForegroundWatch]);

  const resume = useCallback(async () => {
    isPausedRef.current = false;
    pausedDurationRef.current += (Date.now() - pauseStartRef.current) / 1000;
    setRunState('RUNNING');
    startTimer();
    if (usingBackgroundRef.current) {
      await resumeBackgroundTracking();
      startPoll();
    } else {
      await startForegroundWatch();
    }
  }, [startTimer, startPoll, startForegroundWatch]);

  const finish = useCallback(async (): Promise<RunSession | null> => {
    stopTimer();
    stopDraftSave();

    let finalState: TrackingState | null;
    if (usingBackgroundRef.current) {
      stopPoll();
      finalState = await stopBackgroundTracking();
      await clearTrackingState();
    } else {
      stopForegroundWatch();
      finalState = foregroundTrackingRef.current;
    }
    clearDraftRun();

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
    const finalDistance = finalState?.distance ?? 0;
    const finalCoords = finalState?.coordinates ?? [];
    const finalZones = finalState?.cyclingZones ?? { zone1: 0, zone2: 0, zone3: 0 };

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
  }, [stopTimer, stopPoll, stopDraftSave, stopForegroundWatch]);

  const reset = useCallback(() => {
    setRunState('IDLE');
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
      stopPoll();
      stopDraftSave();
      stopForegroundWatch();
    };
  }, [stopTimer, stopPoll, stopDraftSave, stopForegroundWatch]);

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
