import { Coordinate, CyclingZones } from '../types';

const EARTH_RADIUS_M = 6371000;

// Haversine 공식: 두 좌표 간 거리(m) 계산
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// 초(seconds) → 분:초/km 페이스 (seconds per km)
export function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters < 10) return 0;
  const distanceKm = distanceMeters / 1000;
  return durationSeconds / distanceKm;
}

// 평균 속도 km/h
export function calculateAverageSpeed(distanceMeters: number, durationSeconds: number): number {
  if (durationSeconds === 0) return 0;
  const distanceKm = distanceMeters / 1000;
  const durationHours = durationSeconds / 3600;
  return distanceKm / durationHours;
}

// 걸음수 추정 (거리 기반)
// 산책: 보폭 0.75m, 달리기: 보폭 1.3m
export function estimateSteps(distanceMeters: number, mode: 'running' | 'walking'): number {
  const strideLength = mode === 'walking' ? 0.75 : 1.3;
  return Math.round(distanceMeters / strideLength);
}

// 자전거 Zone 계산 (속도 기반)
// Zone1: < 16 km/h (회복)
// Zone2: 16-23 km/h (유산소)
// Zone3+: > 23 km/h (임계/파워)
export function getCyclingZone(speedKmh: number): 1 | 2 | 3 {
  if (speedKmh < 16) return 1;
  if (speedKmh < 23) return 2;
  return 3;
}

// 자전거 Zone 레이블
export function getCyclingZoneLabel(zone: 1 | 2 | 3): string {
  switch (zone) {
    case 1: return 'Zone 1 (회복)';
    case 2: return 'Zone 2 (유산소)';
    case 3: return 'Zone 3 (파워)';
  }
}

// 좌표 배열에서 각 구간 속도(km/h) 계산
export function calculateSegmentSpeeds(coords: Coordinate[]): number[] {
  if (coords.length < 2) return [];
  const speeds: number[] = [];
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    // device-reported speed 우선 사용
    if (curr.speed != null && curr.speed >= 0) {
      speeds.push(curr.speed);
    } else {
      const dist = haversineDistance(prev, curr);
      const timeSec = (curr.timestamp - prev.timestamp) / 1000;
      if (timeSec > 0) {
        speeds.push((dist / timeSec) * 3.6);
      } else {
        speeds.push(0);
      }
    }
  }
  return speeds;
}

// 속도 정규화 → 0~1 사이 값 (지도 색상용)
export function normalizeSpeed(speed: number, minSpeed: number, maxSpeed: number): number {
  if (maxSpeed <= minSpeed) return 0.5;
  return Math.min(1, Math.max(0, (speed - minSpeed) / (maxSpeed - minSpeed)));
}

// 속도 기반 색상 (파란색=느림, 빨간색=빠름)
export function speedToColor(normalized: number): string {
  // blue(59,130,246) → purple(139,92,246) → red(239,68,68)
  let r: number, g: number, b: number;
  if (normalized < 0.5) {
    const t = normalized * 2;
    r = Math.round(59 + t * (139 - 59));
    g = Math.round(130 + t * (92 - 130));
    b = Math.round(246);
  } else {
    const t = (normalized - 0.5) * 2;
    r = Math.round(139 + t * (239 - 139));
    g = Math.round(92 + t * (68 - 92));
    b = Math.round(246 + t * (68 - 246));
  }
  return `rgb(${r},${g},${b})`;
}

// Zone 시간 비율 계산
export function calcZonePercentages(zones: CyclingZones): { z1: number; z2: number; z3: number } {
  const total = zones.zone1 + zones.zone2 + zones.zone3;
  if (total === 0) return { z1: 0, z2: 0, z3: 0 };
  return {
    z1: (zones.zone1 / total) * 100,
    z2: (zones.zone2 / total) * 100,
    z3: (zones.zone3 / total) * 100,
  };
}
