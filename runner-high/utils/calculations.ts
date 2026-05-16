import { Coordinate } from '../types';

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
