export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
export type TrafficLevel = 'Normal' | 'Moderate' | 'Heavy' | 'Critical';
export type CameraType = 'ANPR Traffic Camera';
export type CityZone = 'Central' | 'North' | 'South' | 'East' | 'West' | 'Tech Corridor';
export type CameraFilter = 'All Cameras' | 'Online' | 'Offline' | 'Maintenance';

export type AIModule = 
  | 'Optical ANPR' 
  | 'Speed Radar' 
  | 'Red Light Enforcement' 
  | 'Wrong-Way Detection' 
  | 'Traffic Density' 
  | 'Helmet/Seatbelt Detection';

export interface Camera {
  id: string;
  code: string; // e.g. "CAM-003"
  name: string;
  location: string;
  lat: number;
  lng: number;
  zone: CityZone;
  status: CameraStatus;
  cameraType: CameraType;
  aiModules?: AIModule[];
  vehiclesPerMin: number;
  trafficLevel: TrafficLevel;
  lastDetectedPlate: string;
  violationsToday: number;
  vehiclesToday: number;
  avgSpeed: number;
  uptime: number; // e.g. 99.4
  direction: string;
  streamUrl?: string;
  resolution: string;
  fps: number;
  ipAddress: string;
  installDate: string;
}

export type VehicleClass = 'Car' | 'Motorcycle' | 'Auto-rickshaw' | 'Bus' | 'Truck' | 'Emergency Vehicle';

export interface Vehicle {
  id: string;
  plate: string; // e.g. "KA01AB1234"
  type: VehicleClass;
  makeModel: string;
  color: string;
  firstSeen: string;
  lastSeen: string;
  sightingsCount: number;
  violationsCount: number;
  isWatchlisted: boolean;
  watchlistReason?: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  registeredOwner: string;
  registeredState: string;
  fuelType?: string;
}

export interface Detection {
  id: string;
  vehicleId: string;
  plate: string;
  cameraCode: string;
  cameraName: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  direction: string;
  speed: number;
  confidence: number; // e.g. 98.4
  vehicleType: VehicleClass;
  vehicleColor: string;
  laneNumber: number;
  bboxVehicle: [number, number, number, number]; // [x%, y%, w%, h%]
  bboxPlate: [number, number, number, number];
  violationId?: string;
  reIdScore?: number;
}

export type ViolationType = 
  | 'Speeding'
  | 'Red Light'
  | 'Wrong Way'
  | 'Illegal Parking'
  | 'No Helmet'
  | 'No Seatbelt'
  | 'Lane Violation'
  | 'Stop Line Violation';

export type ViolationStatus = 'New' | 'Under Review' | 'Confirmed' | 'Rejected' | 'Resolved';

export interface Violation {
  id: string;
  challanNumber: string;
  vehicleId: string;
  plate: string;
  cameraCode: string;
  location: string;
  timestamp: string;
  violationType: ViolationType;
  speedLimit?: number;
  recordedSpeed?: number;
  fineAmount: number;
  confidence: number;
  status: ViolationStatus;
  evidenceImage: string;
  vehicleType: VehicleClass;
  vehicleColor: string;
  notes?: string;
  adjudicatedBy?: string;
  adjudicatedAt?: string;
  rejectionReason?: string;
}

export interface TrajectoryPoint {
  cameraCode: string;
  cameraName: string;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  confidence: number;
  plate: string;
  detectionId: string;
  violationDetected?: boolean;
  violationType?: ViolationType;
}

export interface RouteSegment {
  fromCamera: string;
  fromLocation: string;
  toCamera: string;
  toLocation: string;
  distanceKm: number;
  timeMinutes: number;
  avgSpeedKmh: number;
  reIdScore: number;
}

export interface TrajectoryRoute {
  vehicleId: string;
  plate: string;
  vehicleType: VehicleClass;
  vehicleColor: string;
  points: TrajectoryPoint[];
  totalDistanceKm: number;
  totalTravelTimeMinutes: number;
  avgSpeedKmh: number;
  longestStopMinutes: number;
  fastestSegmentKmh: number;
  reIdConfidence: number;
  segments: RouteSegment[];
  suspiciousTrajectory?: boolean;
  suspiciousReason?: string;
}

export type AlertSeverity = 'Critical' | 'Warning' | 'Information';
export type AlertCategory = 'WATCHLIST' | 'VIOLATION' | 'CONGESTION' | 'HARDWARE' | 'TRAJECTORY';

export interface Alert {
  id: string;
  title: string;
  type: AlertSeverity;
  category: AlertCategory;
  vehiclePlate?: string;
  cameraCode?: string;
  location: string;
  timestamp: string;
  description: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  actionRequired?: string;
}

export interface WatchlistItem {
  id: string;
  plate: string;
  vehicleType: VehicleClass;
  color: string;
  reason: string;
  priority: 'Critical' | 'High' | 'Medium';
  addedDate: string;
  addedBy: string;
  notes: string;
  isActive: boolean;
  flaggedSightings: number;
}

export interface IntersectionStats {
  id: string;
  name: string;
  zone: CityZone;
  lat: number;
  lng: number;
  trafficLevel: TrafficLevel;
  vehiclesPerMin: number;
  avgSpeedKmh: number;
  queueLengthMeters: number;
  violationsToday: number;
  camerasCount: number;
  hourlyVolume: { hour: string; count: number; avgSpeed: number }[];
}

export type UserRole = 'Government Operator' | 'Administrator' | 'Traffic Operator' | 'Analyst';

export interface UserProfile {
  id: string;
  name: string;
  badgeNumber: string;
  role: UserRole;
  department: string;
  shift: string;
  avatar?: string;
}

export interface DashboardStats {
  activeCameras: number;
  totalCameras: number;
  vehiclesDetectedToday: number;
  violationsToday: number;
  vehiclesTracked: number;
  activeAlerts: number;
  currentTrafficVolume: number;
  peakTrafficTime: string;
  averageCitySpeed: number;
}
