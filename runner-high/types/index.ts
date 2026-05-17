export type ActivityMode = 'running' | 'walking' | 'cycling';

export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number; // km/h
}

export interface CyclingZones {
  zone1: number; // seconds < 16 km/h
  zone2: number; // seconds 16-23 km/h
  zone3: number; // seconds > 23 km/h
}

export interface RunSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;       // seconds (active time only)
  distance: number;       // meters
  pace: number;           // seconds per km
  coordinates: Coordinate[];
  averageSpeed: number;   // km/h
  mode: ActivityMode;
  steps?: number;         // estimated steps (walking/running)
  cyclingZones?: CyclingZones;
}

export interface AppSettings {
  geminiApiKey: string;
}

export type RunState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
