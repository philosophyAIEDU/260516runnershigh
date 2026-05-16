export interface Coordinate {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
}

export interface RunSession {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;       // seconds
  distance: number;       // meters
  pace: number;           // seconds per km
  coordinates: Coordinate[];
  averageSpeed: number;   // km/h
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
