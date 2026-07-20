import { Coordinate, CyclingZones, ActivityMode } from '../types';
import { haversineDistance, getCyclingZone } from './calculations';

// 추적 상태: 거리 누적/좌표/자전거 존을 담는 순수 데이터
export interface TrackingState {
  distance: number;              // meters
  lastCoord: Coordinate | null;
  coordinates: Coordinate[];
  cyclingZones: CyclingZones;
  currentSpeed: number;          // km/h
  gpsWeak: boolean;
}

export function createTrackingState(): TrackingState {
  return {
    distance: 0,
    lastCoord: null,
    coordinates: [],
    cyclingZones: { zone1: 0, zone2: 0, zone3: 0 },
    currentSpeed: 0,
    gpsWeak: false,
  };
}

// GPS 순간이동(튐) 필터 임계값: 100 m/s 이상은 물리적으로 불가능
const MAX_PLAUSIBLE_SPEED_MPS = 100;
// accuracy 20m 이하만 유효 (locationService.isAccurateEnough와 동일 기준)
const MAX_ACCURACY_M = 20;

/**
 * 좌표 하나를 추적 상태에 누적하는 순수 함수.
 * 포그라운드(watchPositionAsync)와 백그라운드(TaskManager) 양쪽에서
 * 동일 로직으로 사용해 거리 계산이 일관되도록 한다.
 */
export function reduceLocation(
  state: TrackingState,
  coord: Coordinate,
  mode: ActivityMode
): TrackingState {
  // 정확도 미달 좌표는 건너뛰되 이전 기준점은 유지한다
  if (coord.accuracy !== undefined && coord.accuracy > MAX_ACCURACY_M) {
    return { ...state, gpsWeak: true };
  }

  let distance = state.distance;
  const zones = { ...state.cyclingZones };
  const point: Coordinate = { ...coord };

  if (state.lastCoord) {
    const delta = haversineDistance(state.lastCoord, point);
    const timeDelta = (point.timestamp - state.lastCoord.timestamp) / 1000;
    if (timeDelta > 0 && delta / timeDelta < MAX_PLAUSIBLE_SPEED_MPS) {
      distance += delta;

      // 기기 속도 미제공 시 haversine 기반으로 보정
      if (point.speed == null) {
        point.speed = (delta / timeDelta) * 3.6;
      }

      // 자전거 존 누적
      if (mode === 'cycling' && point.speed != null) {
        const zone = getCyclingZone(point.speed);
        if (zone === 1) zones.zone1 += timeDelta;
        else if (zone === 2) zones.zone2 += timeDelta;
        else zones.zone3 += timeDelta;
      }
    }
  }

  return {
    distance,
    lastCoord: point,
    coordinates: [...state.coordinates, point],
    cyclingZones: zones,
    currentSpeed: point.speed ?? 0,
    gpsWeak: false,
  };
}
