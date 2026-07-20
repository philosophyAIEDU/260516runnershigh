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

  // 웹(포그라운드 watchPositionAsync) 폴백용 인메모리 상태 + 구독
  const webTrackingRef = useRef<TrackingState>(createTrackingState());
  const webSubRef = useRef<Location.LocationSubscription | null>(null);

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

  // 웹: 포그라운드 위치 구독 (백그라운드 미지원)
  const startWebWatch = useCallback(async () => {
    webSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.LocationAccuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const coord = toCoordinate(loc);
        webTrackingRef.current = reduceLocation(webTrackingRef.current, coord, modeRef.current);
        applyTracking(webTrackingRef.current);
      }
    );
  }, [applyTracking]);

  const stopWebWatch = useCallback(() => {
    webSubRef.current?.remove();
    webSubRef.current = null;
  }, []);

  const startDraftSave = useCallback(() => {
    draftTimerRef.current = setInterval(async () => {
      const ts = IS_NATIVE ? await readTrackingState() : webTrackingRef.current;
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
      webTrackingRef.current = createTrackingState();

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

      try {
        if (IS_NATIVE) {
          await startBackgroundTracking(activityMode);
          startPoll();
        } else {
          await startWebWatch();
        }
      } catch (e) {
        console.error('위치 추적 시작 실패:', e);
        stopTimer();
        setRunState('IDLE');
        return false;
      }

      startDraftSave();
      return true;
    },
    [startTimer, stopTimer, startPoll, startWebWatch, startDraftSave]
  );

  const pause = useCallback(async () => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    setRunState('PAUSED');
    stopTimer();
    if (IS_NATIVE) {
      stopPoll();
      await pauseBackgroundTracking();
    } else {
      stopWebWatch();
      // 재개 시 정지 중 이동거리가 더해지지 않도록 기준점 초기화
      webTrackingRef.current = { ...webTrackingRef.current, lastCoord: null };
    }
  }, [stopTimer, stopPoll, stopWebWatch]);

  const resume = useCallback(async () => {
    isPausedRef.current = false;
    pausedDurationRef.current += (Date.now() - pauseStartRef.current) / 1000;
    setRunState('RUNNING');
    startTimer();
    if (IS_NATIVE) {
      await resumeBackgroundTracking();
      startPoll();
    } else {
      await startWebWatch();
    }
  }, [startTimer, startPoll, startWebWatch]);

  const finish = useCallback(async (): Promise<RunSession | null> => {
    stopTimer();
    stopDraftSave();

    let finalState: TrackingState | null;
    if (IS_NATIVE) {
      stopPoll();
      finalState = await stopBackgroundTracking();
      await clearTrackingState();
    } else {
      stopWebWatch();
      finalState = webTrackingRef.current;
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
  }, [stopTimer, stopPoll, stopDraftSave, stopWebWatch]);

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
      stopWebWatch();
    };
  }, [stopTimer, stopPoll, stopDraftSave, stopWebWatch]);

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
