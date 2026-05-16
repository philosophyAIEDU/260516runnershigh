import * as Location from 'expo-location';
import { Coordinate } from '../types';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function requestBackgroundPermission(): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === 'granted';
}

export function toCoordinate(loc: Location.LocationObject): Coordinate {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    timestamp: loc.timestamp,
    accuracy: loc.coords.accuracy ?? undefined,
  };
}

// accuracy 20m 이하인 좌표만 유효
export function isAccurateEnough(coord: Coordinate): boolean {
  if (coord.accuracy === undefined) return true;
  return coord.accuracy <= 20;
}
