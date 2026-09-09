export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/live';

export const CITY_ZONES = [
  'Central',
  'North',
  'South',
  'East',
  'West',
  'Tech Corridor'
] as const;

export const DEFAULT_SPEED_LIMIT_KMH = 80;

export const THEME_STORAGE_KEY = 'citywatch_theme';
export const PERSISTED_VEHICLES_KEY = 'citywatch_custom_registered_vehicles';
export const PERSISTED_DETECTIONS_KEY = 'citywatch_custom_detections';
