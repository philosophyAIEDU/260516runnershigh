import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { RunState, Coordinate, RunSession } from '../types';
import { requestLocationPermission, toCoordinate, isAccurateEnough } from '../services/locationService';
import { haversineDistance, calculatePace, calculateAverageSpeed } from '../utils/calculations';
import { saveDraftRun, clearDraftRun } from '../services/storageService';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useRunTracking() {
  const [runState, setRunState] = useState<RunState>('IDLE');
  const [duration, setDuration] = useState(0);       // seconds
  const [distance, setDistance] = useState(0);       // meters
  const [pace, setPace] = useState(0);               // seconds/km
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [gpsWeak, setGpsWeak] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);

  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);       // 누적 일시정지 시간(s)
  const pauseStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const distanceRef = useRef<number>(0);
  const coordsRef = useRef<Coordinate[]>([]);
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>('');

  // 타이머: 1초마다 duration 업데이트
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
      setDuration(Math.floor(elapsed));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // GPS 구독 시작
  const startLocationTracking = useCallback(async () => {
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        const coord = toCoordinate(loc);

        if (!isAccurateEnough(coord)) {
          setGpsWeak(true);
          return;
        }
        setGpsWeak(false);

        // 거리 누적 계산
        if (lastCoordRef.current) {
          const delta = haversineDistance(lastCoordRef.current, coord);
          // 비현실적 이동(100m/s 이상)은 무시
          const timeDelta = (coord.timestamp - lastCoordRef.current.timestamp) / 1000;
          if (timeDelta > 0 && delta / timeDelta < 100) {
            distanceRef.current += delta;
            setDistance(distanceRef.current);
          }
        }

        lastCoordRef.current = coord;
        coordsRef.current = [...coordsRef.current, coord];
        setCoordinates((prev) => [...prev, coord]);

        // 페이스 / 속도 업데이트
        const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
        if (elapsed > 0) {
          setPace(calculatePace(distanceRef.current, elapsed));
          setAverageSpeed(calculateAverageSpeed(distanceRef.current, elapsed));
        }
      }
    );
  }, []);

  const stopLocationTracking = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  }, []);

  // 1분마다 중간 저장
  const startDraftSave = useCallback(() => {
    draftTimerRef.current = setInterval(async () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
      await saveDraftRun({
        id: sessionIdRef.current,
        startTime: startTimeRef.current,
        distance: distanceRef.current,
        duration: Math.floor(elapsed),
        coordinates: coordsRef.current,
      });
    }, 60000);
  }, []);

  const stopDraftSave = useCallback(() => {
    if (draftTimerRef.current) {
      clearInterval(draftTimerRef.current);
      draftTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    const permitted = await requestLocationPermission();
    if (!permitted) return false;

    sessionIdRef.current = generateId();
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    distanceRef.current = 0;
    coordsRef.current = [];
    lastCoordRef.current = null;

    setDuration(0);
    setDistance(0);
    setPace(0);
    setAverageSpeed(0);
    setCoordinates([]);
    setGpsWeak(false);

    setRunState('RUNNING');
    startTimer();
    await startLocationTracking();
    startDraftSave();
    return true;
  }, [startTimer, startLocationTracking, startDraftSave]);

  const pause = useCallback(() => {
    pauseStartRef.current = Date.now();
    setRunState('PAUSED');
    stopTimer();
    stopLocationTracking();
  }, [stopTimer, stopLocationTracking]);

  const resume = useCallback(async () => {
    pausedDurationRef.current += (Date.now() - pauseStartRef.current) / 1000;
    setRunState('RUNNING');
    startTimer();
    await startLocationTracking();
  }, [startTimer, startLocationTracking]);

  const finish = useCallback((): RunSession | null => {
    stopTimer();
    stopLocationTracking();
    stopDraftSave();
    clearDraftRun();

    const endTime = Date.now();
    const elapsed = (endTime - startTimeRef.current) / 1000 - pausedDurationRef.current;
    if (elapsed < 1) {
      setRunState('IDLE');
      return null;
    }

    const session: RunSession = {
      id: sessionIdRef.current,
      startTime: startTimeRef.current,
      endTime,
      duration: Math.floor(elapsed),
      distance: distanceRef.current,
      pace: calculatePace(distanceRef.current, Math.floor(elapsed)),
      averageSpeed: calculateAverageSpeed(distanceRef.current, Math.floor(elapsed)),
      coordinates: coordsRef.current,
    };

    setRunState('FINISHED');
    return session;
  }, [stopTimer, stopLocationTracking, stopDraftSave]);

  const reset = useCallback(() => {
    setRunState('IDLE');
    setDuration(0);
    setDistance(0);
    setPace(0);
    setAverageSpeed(0);
    setCoordinates([]);
    setGpsWeak(false);
  }, []);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopTimer();
      stopLocationTracking();
      stopDraftSave();
    };
  }, [stopTimer, stopLocationTracking, stopDraftSave]);

  return {
    runState,
    duration,
    distance,
    pace,
    averageSpeed,
    gpsWeak,
    coordinates,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
