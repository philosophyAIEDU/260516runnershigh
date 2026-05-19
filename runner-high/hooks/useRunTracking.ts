import { useState, useRef, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { RunState, Coordinate, RunSession, ActivityMode, CyclingZones } from '../types';
import { requestLocationPermission, toCoordinate, isAccurateEnough } from '../services/locationService';
import { haversineDistance, calculatePace, calculateAverageSpeed, getCyclingZone, estimateSteps } from '../utils/calculations';
import { saveDraftRun, clearDraftRun } from '../services/storageService';

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
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastCoordRef = useRef<Coordinate | null>(null);
  const distanceRef = useRef<number>(0);
  const coordsRef = useRef<Coordinate[]>([]);
  const draftTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string>('');
  const modeRef = useRef<ActivityMode>('running');
  const cyclingZonesRef = useRef<CyclingZones>({ zone1: 0, zone2: 0, zone3: 0 });

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
      setDuration(Math.floor(Math.max(0, elapsed)));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

        if (lastCoordRef.current) {
          const delta = haversineDistance(lastCoordRef.current, coord);
          const timeDelta = (coord.timestamp - lastCoordRef.current.timestamp) / 1000;
          if (timeDelta > 0 && delta / timeDelta < 100) {
            distanceRef.current += delta;
            setDistance(distanceRef.current);

            // speed from haversine if device speed unavailable
            if (coord.speed == null) {
              coord.speed = (delta / timeDelta) * 3.6;
            }

            // cycling zone tracking
            if (modeRef.current === 'cycling' && coord.speed != null) {
              const zone = getCyclingZone(coord.speed);
              if (zone === 1) cyclingZonesRef.current.zone1 += timeDelta;
              else if (zone === 2) cyclingZonesRef.current.zone2 += timeDelta;
              else cyclingZonesRef.current.zone3 += timeDelta;
            }
          }
        }

        setCurrentSpeed(coord.speed ?? 0);
        lastCoordRef.current = coord;
        coordsRef.current = [...coordsRef.current, coord];
        setCoordinates((prev) => [...prev, coord]);

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

  const start = useCallback(async (activityMode: ActivityMode = 'running') => {
    const permitted = await requestLocationPermission();
    if (!permitted) return false;

    sessionIdRef.current = generateId();
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    pauseStartRef.current = 0;
    isPausedRef.current = false;
    distanceRef.current = 0;
    coordsRef.current = [];
    lastCoordRef.current = null;
    modeRef.current = activityMode;
    cyclingZonesRef.current = { zone1: 0, zone2: 0, zone3: 0 };

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
    await startLocationTracking();
    startDraftSave();
    return true;
  }, [startTimer, startLocationTracking, startDraftSave]);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    setRunState('PAUSED');
    stopTimer();
    stopLocationTracking();
  }, [stopTimer, stopLocationTracking]);

  const resume = useCallback(async () => {
    isPausedRef.current = false;
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
    // If finishing while paused, include current pause duration in total
    const currentPauseDuration = isPausedRef.current && pauseStartRef.current > 0
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
    const session: RunSession = {
      id: sessionIdRef.current,
      startTime: startTimeRef.current,
      endTime,
      duration: safeDuration,
      distance: distanceRef.current,
      pace: calculatePace(distanceRef.current, safeDuration),
      averageSpeed: calculateAverageSpeed(distanceRef.current, safeDuration),
      coordinates: coordsRef.current,
      mode: currentMode,
      steps: currentMode !== 'cycling'
        ? estimateSteps(distanceRef.current, currentMode === 'walking' ? 'walking' : 'running')
        : undefined,
      cyclingZones: currentMode === 'cycling'
        ? { ...cyclingZonesRef.current }
        : undefined,
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
    setCurrentSpeed(0);
    setCoordinates([]);
    setGpsWeak(false);
  }, []);

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
