import { 
  Camera, Vehicle, Detection, Violation, Alert, WatchlistItem, 
  TrajectoryRoute, DashboardStats, UserProfile, ViolationStatus, CameraStatus, TrajectoryPoint, RouteSegment,
  VideoDetection
} from '../types';
import { 
  ALL_CAMERAS, ALL_VEHICLES, FLAGSHIP_DETECTIONS, 
  ALL_VIOLATIONS, INITIAL_ALERTS, INITIAL_WATCHLIST 
} from '../data/bengaluruData';
import { apiClient } from './api/apiClient';


// Function to calculate geographical distance using Haversine formula (km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

class TrafficStoreService {
  private cameras: Camera[] = [...ALL_CAMERAS];
  private vehicles: Vehicle[] = [...ALL_VEHICLES];
  private detections: Detection[] = [...FLAGSHIP_DETECTIONS];
  private violations: Violation[] = [...ALL_VIOLATIONS];
  private alerts: Alert[] = [...INITIAL_ALERTS];
  private watchlist: WatchlistItem[] = [...INITIAL_WATCHLIST];
  private currentUser: UserProfile = {
    id: 'usr-001',
    name: 'Government Operator',
    badgeNumber: 'BTP-GOV-01',
    role: 'Government Operator',
    department: 'Bangalore Traffic Police Command & Control (TMC)',
    shift: 'Surveillance Desk 24/7'
  };

  private theme: 'dark' | 'light' = (typeof localStorage !== 'undefined' && localStorage.getItem('citywatch_theme') as 'dark' | 'light') || 'dark';
  private listeners: Set<() => void> = new Set();
  private simulationIntervalId: any = null;
  private isSimulating: boolean = true;
  private latestEventToast: { title: string; message: string; type: 'info' | 'warning' | 'critical'; targetPlate?: string } | null = null;
  private lastToastTimestamp: number = 0;
  private cameraHourlyVolumes: Map<string, number[]> = new Map();

  constructor() {
    this.loadPersistedCustomData();
    this.initializeHourlyVolumes();
    this.seedGeneralDetections();
    this.startSimulation();
  }

  private loadPersistedCustomData() {
    if (typeof localStorage === 'undefined') return;
    try {
      const storedVehicles = localStorage.getItem('citywatch_custom_registered_vehicles');
      if (storedVehicles) {
        const parsed: Vehicle[] = JSON.parse(storedVehicles);
        parsed.forEach(v => {
          if (!this.vehicles.some(existing => existing.plate === v.plate)) {
            this.vehicles.unshift(v);
          }
        });
      }

      const storedDetections = localStorage.getItem('citywatch_custom_detections');
      if (storedDetections) {
        const parsedDets: Detection[] = JSON.parse(storedDetections);
        parsedDets.forEach(d => {
          if (!this.detections.some(existing => existing.id === d.id)) {
            this.detections.unshift(d);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load persisted ANPR vehicles:', e);
    }
  }

  private savePersistedCustomData() {
    if (typeof localStorage === 'undefined') return;
    try {
      // Save only custom detected/registered vehicles (beyond the base initial ones or modified)
      const customVehicles = this.vehicles.filter(v => v.id.startsWith('veh-') || (v as any).isAutoRegistered);
      localStorage.setItem('citywatch_custom_registered_vehicles', JSON.stringify(customVehicles.slice(0, 500)));

      const customDetections = this.detections.filter(d => d.id.startsWith('det-vid-'));
      localStorage.setItem('citywatch_custom_detections', JSON.stringify(customDetections.slice(0, 500)));
    } catch (e) {
      console.warn('Failed to save persisted ANPR vehicles:', e);
    }
  }


  private initializeHourlyVolumes() {
    const hourlyCurve = [
      420, 260, 180, 210, 390, 890, 2100, 4350, 5640, 5890, 4720, 3950,
      3820, 3610, 3750, 4290, 5100, 5920, 5810, 4980, 3850, 2740, 1850, 920
    ];

    // City-Wide Aggregate
    this.cameraHourlyVolumes.set('ALL', [...hourlyCurve]);

    // Individual Cameras
    this.cameras.forEach(cam => {
      const scale = Math.max(0.2, (cam.vehiclesPerMin || 40) / 75);
      const camCurve = hourlyCurve.map(v => Math.max(10, Math.round(v * scale * (0.85 + Math.random() * 0.3))));
      this.cameraHourlyVolumes.set(cam.code, camCurve);
    });
  }

  // Pre-seed some realistic detections for other vehicles
  private seedGeneralDetections() {
    const extraVehicles = this.vehicles.slice(1, 15);
    const cams = this.cameras.slice(0, 15);

    extraVehicles.forEach((veh, vIdx) => {
      const numSightings = 3 + (vIdx % 4);
      for (let s = 0; s < numSightings; s++) {
        const cam = cams[(vIdx * 2 + s * 3) % cams.length];
        const hour = String(7 + s).padStart(2, '0');
        const min = String(10 + ((vIdx * 13 + s * 17) % 45)).padStart(2, '0');
        const speed = 28 + ((vIdx * 7 + s * 11) % 45);

        this.detections.push({
          id: `det-gen-${vIdx}-${s}`,
          vehicleId: veh.id,
          plate: veh.plate,
          cameraCode: cam.code,
          cameraName: cam.name,
          location: cam.location,
          lat: cam.lat,
          lng: cam.lng,
          timestamp: `2026-08-28T${hour}:${min}:00.000Z`,
          direction: s % 2 === 0 ? 'Southbound' : 'Eastbound',
          speed: Number(speed.toFixed(1)),
          confidence: 96.5 + (s % 3),
          vehicleType: veh.type,
          vehicleColor: veh.color,
          laneNumber: (s % 3) + 1,
          bboxVehicle: [180 + s * 10, 130 + s * 5, 260, 200],
          bboxPlate: [240 + s * 10, 265 + s * 5, 120, 36],
          reIdScore: 94.0 + (s % 5)
        });
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // Simulation Engine
  public startSimulation() {
    if (this.simulationIntervalId) return;
    this.isSimulating = true;
    this.simulationIntervalId = setInterval(() => {
      this.simulateLiveEvent();
    }, 4500);
  }

  public stopSimulation() {
    if (this.simulationIntervalId) {
      clearInterval(this.simulationIntervalId);
      this.simulationIntervalId = null;
    }
    this.isSimulating = false;
    this.notify();
  }

  public toggleSimulation() {
    if (this.isSimulating) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  public isSimulationActive(): boolean {
    return this.isSimulating;
  }

  public getLatestToast() {
    return this.latestEventToast;
  }

  public clearToast() {
    this.latestEventToast = null;
    this.lastToastTimestamp = Date.now();
    this.notify();
  }

  private simulateLiveEvent() {
    const liveCams = this.cameras.filter(c => c.status === 'ONLINE');
    if (liveCams.length === 0) return;

    const randomCam = liveCams[Math.floor(Math.random() * liveCams.length)];
    const randomVeh = this.vehicles[Math.floor(Math.random() * this.vehicles.length)];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const isoTime = now.toISOString();

    const speed = Math.floor(25 + Math.random() * 55);
    const isWatch = this.watchlist.some(w => w.plate === randomVeh.plate && w.isActive);

    // Create detection
    const newDet: Detection = {
      id: `det-live-${Date.now()}`,
      vehicleId: randomVeh.id,
      plate: randomVeh.plate,
      cameraCode: randomCam.code,
      cameraName: randomCam.name,
      location: randomCam.location,
      lat: randomCam.lat,
      lng: randomCam.lng,
      timestamp: isoTime,
      direction: Math.random() > 0.5 ? 'Southbound' : 'Northbound',
      speed,
      confidence: Number((95 + Math.random() * 4.8).toFixed(1)),
      vehicleType: randomVeh.type,
      vehicleColor: randomVeh.color,
      laneNumber: Math.floor(1 + Math.random() * 3),
      bboxVehicle: [160 + Math.floor(Math.random() * 40), 120, 270, 210],
      bboxPlate: [230 + Math.floor(Math.random() * 30), 260, 130, 38],
      reIdScore: Number((93 + Math.random() * 6.5).toFixed(1))
    };

    this.detections.unshift(newDet);
    if (this.detections.length > 800) this.detections.pop();

    // Update Camera stats & 24-Hour live hourly histogram
    randomCam.lastDetectedPlate = randomVeh.plate;
    randomCam.vehiclesToday += 1;
    randomCam.vehiclesPerMin = Math.min(100, Math.max(15, randomCam.vehiclesPerMin + (Math.random() > 0.5 ? 1 : -1)));

    const currentHourIndex = now.getHours();
    // Increment city-wide bucket
    const allCurve = this.cameraHourlyVolumes.get('ALL') || [];
    if (allCurve[currentHourIndex] !== undefined) {
      allCurve[currentHourIndex] += 1;
    }
    // Increment camera bucket
    const camCurve = this.cameraHourlyVolumes.get(randomCam.code);
    if (camCurve && camCurve[currentHourIndex] !== undefined) {
      camCurve[currentHourIndex] += 1;
    }

    // Watchlist trigger
    if (isWatch) {
      const alertItem: Alert = {
        id: `alt-live-${Date.now()}`,
        title: `WATCHLIST INTERCEPT: ${randomVeh.plate}`,
        type: 'Critical',
        category: 'WATCHLIST',
        vehiclePlate: randomVeh.plate,
        cameraCode: randomCam.code,
        location: randomCam.location,
        timestamp: timeStr,
        description: `Target vehicle ${randomVeh.plate} (${randomVeh.type} - ${randomVeh.color}) recognized at ${randomCam.name}. Speed: ${speed} km/h.`,
        status: 'ACTIVE',
        actionRequired: 'Dispatch nearest BTP interceptor unit'
      };
      this.alerts.unshift(alertItem);

      // Only show popup notification if not dismissed recently (60-second cooldown)
      if (Date.now() - this.lastToastTimestamp > 60000) {
        this.latestEventToast = {
          title: `Watchlist Vehicle Detected!`,
          message: `${randomVeh.plate} sighted at ${randomCam.name}`,
          type: 'critical',
          targetPlate: randomVeh.plate
        };
        this.lastToastTimestamp = Date.now();
      }
    }

    // Occasional Violation Trigger (1 in 7 chance)
    if (Math.random() < 0.15 && speed > 55) {
      randomCam.violationsToday += 1;
      const vTypes: Violation['violationType'][] = ['Speeding', 'Lane Violation', 'Stop Line Violation'];
      const vType = vTypes[Math.floor(Math.random() * vTypes.length)];
      const newViol: Violation = {
        id: `viol-live-${Date.now()}`,
        challanNumber: `BLR-2026-${Math.floor(20000 + Math.random() * 90000)}`,
        vehicleId: randomVeh.id,
        plate: randomVeh.plate,
        cameraCode: randomCam.code,
        location: randomCam.location,
        timestamp: isoTime,
        violationType: vType,
        speedLimit: vType === 'Speeding' ? 50 : undefined,
        recordedSpeed: vType === 'Speeding' ? speed : undefined,
        fineAmount: vType === 'Speeding' ? 2000 : 1000,
        confidence: Number((94 + Math.random() * 5).toFixed(1)),
        status: 'New',
        vehicleType: randomVeh.type,
        vehicleColor: randomVeh.color,
        evidenceImage: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
        notes: `Optical violation detected via AI Camera ${randomCam.code}.`
      };
      this.violations.unshift(newViol);
      newDet.violationId = newViol.id;
    }

    this.notify();
  }

  // Camera Methods
  public getCameras(): Camera[] {
    return this.cameras;
  }

  public getCameraByCode(code: string): Camera | undefined {
    return this.cameras.find(c => c.code.toLowerCase() === code.toLowerCase() || c.id === code);
  }

  public addCamera(cameraData: Omit<Camera, 'id' | 'violationsToday' | 'vehiclesToday' | 'uptime'>): Camera {
    const newCam: Camera = {
      ...cameraData,
      id: `cam-user-${Date.now()}`,
      cameraType: 'ANPR Traffic Camera',
      status: cameraData.status || 'ONLINE',
      aiModules: cameraData.aiModules || ['Optical ANPR', 'Speed Radar', 'Red Light Enforcement', 'Traffic Density', 'Wrong-Way Detection'],
      violationsToday: 0,
      vehiclesToday: 0,
      uptime: 100.0
    };
    this.cameras.unshift(newCam);
    this.alerts.unshift({
      id: `alt-cam-add-${Date.now()}`,
      title: `New Camera Registered: ${newCam.code}`,
      type: 'Information',
      category: 'HARDWARE',
      cameraCode: newCam.code,
      location: newCam.location,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      description: `New ${newCam.cameraType} installed at ${newCam.location} (${newCam.zone} Zone). RTSP channel initialized.`,
      status: 'RESOLVED'
    });
    this.notify();
    return newCam;
  }

  public updateCameraStatus(idOrCode: string, status: CameraStatus) {
    const cam = this.cameras.find(c => c.id === idOrCode || c.code === idOrCode);
    if (cam) {
      cam.status = status;
      if (status === 'OFFLINE') {
        this.alerts.unshift({
          id: `alt-cam-off-${Date.now()}`,
          title: `Camera Offline Alert: ${cam.code}`,
          type: 'Warning',
          category: 'HARDWARE',
          cameraCode: cam.code,
          location: cam.location,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          description: `Camera ${cam.code} (${cam.name}) lost network heartbeat.`,
          status: 'ACTIVE',
          actionRequired: 'Inspect network link'
        });
      }
      this.notify();
    }
  }

  // Vehicle Methods
  public getVehicles(): Vehicle[] {
    return this.vehicles;
  }

  public getVehicleByPlate(plate: string): Vehicle | undefined {
    const cleanPlate = plate.trim().toUpperCase().replace(/[\s-]/g, '');
    return this.vehicles.find(v => v.plate.replace(/[\s-]/g, '').toUpperCase() === cleanPlate);
  }

  public searchVehicles(query: string, filters?: { zone?: string; type?: string; hasViolation?: boolean }): Vehicle[] {
    const q = query.trim().toUpperCase().replace(/[\s-]/g, '');
    return this.vehicles.filter(v => {
      const matchPlate = !q || v.plate.replace(/[\s-]/g, '').toUpperCase().includes(q) || v.makeModel.toUpperCase().includes(query.toUpperCase()) || v.registeredOwner.toUpperCase().includes(query.toUpperCase());
      const matchType = !filters?.type || filters.type === 'All' || v.type === filters.type;
      const matchViol = filters?.hasViolation === undefined ? true : (filters.hasViolation ? v.violationsCount > 0 : v.violationsCount === 0);
      return matchPlate && matchType && matchViol;
    });
  }

  // Detections & Trajectory
  public getDetections(): Detection[] {
    return this.detections;
  }

  public getDetectionsByVehicle(plateOrId: string): Detection[] {
    const clean = plateOrId.trim().toUpperCase().replace(/[\s-]/g, '');
    return this.detections.filter(d => 
      d.plate.replace(/[\s-]/g, '').toUpperCase() === clean || d.vehicleId === plateOrId
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getDetectionsByCamera(cameraCode: string): Detection[] {
    return this.detections.filter(d => 
      d.cameraCode.toLowerCase() === cameraCode.toLowerCase()
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getVehicleTrajectory(plate: string): TrajectoryRoute | null {
    const veh = this.getVehicleByPlate(plate);
    if (!veh) return null;

    let dets = this.getDetectionsByVehicle(veh.plate);

    // If no detections in array, generate 4-5 based on camera locations
    if (dets.length === 0) {
      const sampleCams = [this.cameras[0], this.cameras[3], this.cameras[6], this.cameras[9]];
      dets = sampleCams.map((c, i) => ({
        id: `det-synth-${veh.plate}-${i}`,
        vehicleId: veh.id,
        plate: veh.plate,
        cameraCode: c.code,
        cameraName: c.name,
        location: c.location,
        lat: c.lat,
        lng: c.lng,
        timestamp: new Date(Date.now() - (4 - i) * 1800000).toISOString(),
        direction: 'Southbound',
        speed: 35 + i * 4,
        confidence: 97.5,
        vehicleType: veh.type,
        vehicleColor: veh.color,
        laneNumber: 2,
        bboxVehicle: [180, 130, 260, 200],
        bboxPlate: [240, 260, 120, 36],
        reIdScore: 96.0
      }));
    }

    const points: TrajectoryPoint[] = dets.map(d => {
      const viol = this.violations.find(v => v.id === d.violationId || (v.plate === d.plate && v.cameraCode === d.cameraCode));
      return {
        cameraCode: d.cameraCode,
        cameraName: d.cameraName,
        location: d.location,
        lat: d.lat,
        lng: d.lng,
        timestamp: d.timestamp,
        speed: d.speed,
        confidence: d.confidence,
        plate: d.plate,
        detectionId: d.id,
        violationDetected: !!viol,
        violationType: viol?.violationType
      };
    });

    // Build segments
    const segments: RouteSegment[] = [];
    let totalDist = 0;
    let maxSpeed = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = haversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
      totalDist += dist;

      const t1 = new Date(p1.timestamp).getTime();
      const t2 = new Date(p2.timestamp).getTime();
      const diffMinutes = Math.max(1, Math.round((t2 - t1) / 60000));
      const segmentSpeed = Number(((dist / (diffMinutes / 60)) || p2.speed).toFixed(1));
      if (segmentSpeed > maxSpeed) maxSpeed = segmentSpeed;

      segments.push({
        fromCamera: p1.cameraCode,
        fromLocation: p1.location,
        toCamera: p2.cameraCode,
        toLocation: p2.location,
        distanceKm: dist,
        timeMinutes: diffMinutes,
        avgSpeedKmh: segmentSpeed,
        reIdScore: Number((93 + Math.random() * 6).toFixed(1))
      });
    }

    const firstTime = new Date(points[0].timestamp).getTime();
    const lastTime = new Date(points[points.length - 1].timestamp).getTime();
    const totalMinutes = Math.max(1, Math.round((lastTime - firstTime) / 60000));
    const avgOverallSpeed = Number(((totalDist / (totalMinutes / 60)) || 32).toFixed(1));

    return {
      vehicleId: veh.id,
      plate: veh.plate,
      vehicleType: veh.type,
      vehicleColor: veh.color,
      points,
      totalDistanceKm: Number(totalDist.toFixed(1)),
      totalTravelTimeMinutes: totalMinutes,
      avgSpeedKmh: avgOverallSpeed,
      longestStopMinutes: 14,
      fastestSegmentKmh: maxSpeed || 76.4,
      reIdConfidence: 94.8,
      segments,
      suspiciousTrajectory: veh.plate === 'KA01AB1234',
      suspiciousReason: veh.plate === 'KA01AB1234' ? 'Rapid corridor switching across 4 zones with 2 active signal violations' : undefined
    };
  }

  // Violations
  public getViolations(): Violation[] {
    return this.violations;
  }

  public getViolationById(id: string): Violation | undefined {
    return this.violations.find(v => v.id === id || v.challanNumber === id);
  }

  public updateViolationStatus(
    id: string, 
    status: ViolationStatus, 
    notes?: string, 
    adjudicatedBy?: string,
    rejectionReason?: string
  ) {
    const viol = this.violations.find(v => v.id === id || v.challanNumber === id);
    if (viol) {
      viol.status = status;
      if (notes) viol.notes = notes;
      if (adjudicatedBy) viol.adjudicatedBy = adjudicatedBy;
      if (rejectionReason) viol.rejectionReason = rejectionReason;
      viol.adjudicatedAt = new Date().toISOString();
      this.notify();
    }
  }

  // Alerts
  public getAlerts(): Alert[] {
    return this.alerts;
  }

  public acknowledgeAlert(id: string) {
    const a = this.alerts.find(item => item.id === id);
    if (a) {
      a.status = 'ACKNOWLEDGED';
      this.notify();
    }
  }

  public resolveAlert(id: string) {
    const a = this.alerts.find(item => item.id === id);
    if (a) {
      a.status = 'RESOLVED';
      this.notify();
    }
  }

  // Watchlist
  public getWatchlist(): WatchlistItem[] {
    return this.watchlist;
  }

  public addToWatchlist(item: Omit<WatchlistItem, 'id' | 'addedDate' | 'flaggedSightings'>) {
    const existing = this.watchlist.find(w => w.plate.toUpperCase().replace(/[\s-]/g, '') === item.plate.toUpperCase().replace(/[\s-]/g, ''));
    if (existing) {
      existing.reason = item.reason;
      existing.priority = item.priority;
      existing.isActive = item.isActive;
      if (item.notes) existing.notes = item.notes;
      this.notify();
      return;
    }

    const newItem: WatchlistItem = {
      ...item,
      id: `wl-item-${Date.now()}`,
      addedDate: new Date().toISOString().split('T')[0],
      flaggedSightings: 0
    };
    this.watchlist.unshift(newItem);

    // Update vehicle flag if exists
    const veh = this.getVehicleByPlate(item.plate);
    if (veh) {
      veh.isWatchlisted = true;
      veh.watchlistReason = item.reason;
      veh.riskLevel = item.priority === 'Critical' ? 'Critical' : 'High';
    }

    this.alerts.unshift({
      id: `alt-wl-add-${Date.now()}`,
      title: `Watchlist Updated: ${newItem.plate}`,
      type: 'Warning',
      category: 'WATCHLIST',
      vehiclePlate: newItem.plate,
      location: 'City-Wide TMC',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      description: `Target vehicle ${newItem.plate} enrolled in surveillance watchlist under priority [${newItem.priority}].`,
      status: 'ACTIVE',
      actionRequired: 'Automated ANPR trigger enabled across all camera nodes'
    });

    this.notify();
  }

  public removeFromWatchlist(id: string) {
    const idx = this.watchlist.findIndex(w => w.id === id);
    if (idx !== -1) {
      const plate = this.watchlist[idx].plate;
      this.watchlist.splice(idx, 1);
      const veh = this.getVehicleByPlate(plate);
      if (veh) {
        veh.isWatchlisted = false;
      }
      this.notify();
    }
  }

  // Dashboard Summary KPIs
  public getDashboardStats(): DashboardStats {
    const activeCams = this.cameras.filter(c => c.status === 'ONLINE').length;
    const totalDetections = this.cameras.reduce((sum, c) => sum + c.vehiclesToday, 0) || 18426;
    const totalViolations = this.violations.length;
    const activeAlertsCount = this.alerts.filter(a => a.status === 'ACTIVE').length;

    return {
      activeCameras: activeCams,
      totalCameras: this.cameras.length,
      vehiclesDetectedToday: totalDetections,
      violationsToday: totalViolations,
      vehiclesTracked: 37,
      activeAlerts: activeAlertsCount,
      currentTrafficVolume: 2480,
      peakTrafficTime: '09:15 AM',
      averageCitySpeed: 31.4
    };
  }

  // 24-Hour Live Histogram for Any Camera or All
  public getHourlyTrafficData(cameraCode: string = 'ALL') {
    const rawVolumes = this.cameraHourlyVolumes.get(cameraCode) || this.cameraHourlyVolumes.get('ALL') || [];
    const maxVal = Math.max(...rawVolumes, 100);
    const currentHourIndex = new Date().getHours();

    return rawVolumes.map((vol, idx) => {
      // 12-hour AM/PM label
      let hourLabel = '';
      if (idx === 0) hourLabel = '12 AM';
      else if (idx < 12) hourLabel = `${idx} AM`;
      else if (idx === 12) hourLabel = '12 PM';
      else hourLabel = `${idx - 12} PM`;

      const hour24 = `${String(idx).padStart(2, '0')}:00`;
      const nextHour24 = `${String((idx + 1) % 24).padStart(2, '0')}:00`;
      const timeRange = `${hour24} - ${nextHour24}`;

      // Realistic speed variation based on congestion
      let avgSpeed = 48 - Math.round((vol / maxVal) * 26);
      if (idx >= 0 && idx <= 5) avgSpeed = 52;

      return {
        hourIndex: idx,
        hourLabel,
        hour24,
        timeRange,
        volume: vol,
        avgSpeed: Math.max(14, avgSpeed),
        isCurrentHour: idx === currentHourIndex,
        isPeak: vol === maxVal
      };
    });
  }

  // User Authentication & Roles
  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public switchUserRole(role: UserProfile['role']) {
    this.currentUser.role = 'Government Operator';
    this.currentUser.name = 'Government Operator';
    this.currentUser.badgeNumber = 'BTP-GOV-01';
    this.currentUser.department = 'Bangalore Traffic Police Command & Control (TMC)';
    this.notify();
  }

  // Video ANPR Integration & Auto-Registration
  public addVehicleIfMissing(vehicleData: Partial<Vehicle> & { plate: string }): Vehicle {
    const cleanPlate = vehicleData.plate.toUpperCase().trim().replace(/[\s-]/g, '');
    const existing = this.getVehicleByPlate(cleanPlate);
    if (existing) {
      if (vehicleData.type && (!existing.type || existing.type === 'Car')) existing.type = vehicleData.type;
      if (vehicleData.color && (!existing.color || existing.color === 'White')) existing.color = vehicleData.color;
      this.savePersistedCustomData();
      return existing;
    }

    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      plate: cleanPlate,
      type: vehicleData.type || 'Car',
      makeModel: vehicleData.makeModel || `${vehicleData.type || 'Car'} (Detected)`,
      color: vehicleData.color || 'White',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      sightingsCount: 1,
      violationsCount: 0,
      isWatchlisted: false,
      riskLevel: 'Low',
      registeredOwner: vehicleData.registeredOwner || 'RTO Database Lookup Pending',
      registeredState: vehicleData.registeredState || 'Universal / Registered',
      fuelType: vehicleData.fuelType || 'Petrol'
    };

    (newVehicle as any).isAutoRegistered = true;

    this.vehicles.unshift(newVehicle);
    this.savePersistedCustomData();
    this.notify();
    return newVehicle;
  }

  public recordVideoDetection(videoDet: VideoDetection, cameraCode: string = 'CAM-V01', cameraName: string = 'Video Stream Feed', location: string = 'Uploaded Video ANPR Analysis'): Detection {
    const cleanPlate = videoDet.plate.toUpperCase().trim().replace(/[\s-]/g, '');
    
    // Check if recent detection for same plate was already logged within last 4 seconds
    const recent = this.detections.find(d => {
      if (d.plate.toUpperCase().replace(/[\s-]/g, '') !== cleanPlate) return false;
      const diffSec = (Date.now() - new Date(d.timestamp).getTime()) / 1000;
      return diffSec >= 0 && diffSec < 4;
    });
    if (recent) {
      return recent;
    }

    const vehicle = this.addVehicleIfMissing({
      plate: videoDet.plate,
      type: videoDet.vehicleType,
      color: videoDet.vehicleColor
    });

    vehicle.sightingsCount += 1;
    vehicle.lastSeen = new Date().toISOString();

    const isWatchlisted = this.watchlist.some(w => w.plate === vehicle.plate && w.isActive);
    if (isWatchlisted) {
      vehicle.isWatchlisted = true;
      vehicle.riskLevel = 'Critical';
    }

    const now = new Date();
    const isoTime = now.toISOString();

    const newDetection: Detection = {
      id: `det-vid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      cameraCode: cameraCode,
      cameraName: cameraName,
      location: location,
      lat: 12.9716 + (Math.random() - 0.5) * 0.05,
      lng: 77.5946 + (Math.random() - 0.5) * 0.05,
      timestamp: isoTime,
      direction: 'Inbound',
      speed: videoDet.speed,
      confidence: videoDet.confidence,
      vehicleType: videoDet.vehicleType,
      vehicleColor: videoDet.vehicleColor,
      laneNumber: videoDet.laneNumber,
      bboxVehicle: videoDet.bboxVehicle,
      bboxPlate: videoDet.bboxPlate,
      reIdScore: Number((95 + Math.random() * 4).toFixed(1))
    };

    this.detections.unshift(newDetection);
    if (this.detections.length > 800) this.detections.pop();

    // Automatically sync detection & full vehicle metadata to FastAPI Backend & MySQL 8.x Database
    apiClient.post('/detections', {
      detection: {
        plate: vehicle.plate,
        cameraCode: cameraCode,
        cameraName: cameraName,
        location: location,
        lat: newDetection.lat,
        lng: newDetection.lng,
        timestamp: isoTime,
        direction: 'Inbound',
        speed: videoDet.speed,
        confidence: videoDet.confidence,
        vehicleType: vehicle.type,
        vehicleColor: vehicle.color,
        makeModel: vehicle.makeModel,
        registeredOwner: vehicle.registeredOwner,
        registeredState: vehicle.registeredState,
        fuelType: vehicle.fuelType,
        laneNumber: videoDet.laneNumber,
        snapshotUrl: videoDet.snapshotUrl
      }
    }).catch(err => {
      // Offline fallback
    });

    // If watchlisted, trigger alert (avoiding duplicate active alerts)
    if (isWatchlisted) {
      const hasActiveAlert = this.alerts.some(a => a.vehiclePlate === vehicle.plate && a.status === 'ACTIVE');
      if (!hasActiveAlert) {
        const alertItem: Alert = {
          id: `alt-vid-${Date.now()}`,
          title: `WATCHLIST INTERCEPT: ${vehicle.plate}`,
          type: 'Critical',
          category: 'WATCHLIST',
          vehiclePlate: vehicle.plate,
          cameraCode: cameraCode,
          location: location,
          timestamp: now.toLocaleTimeString('en-US', { hour12: false }),
          description: `Uploaded Video Analysis detected watchlisted vehicle ${vehicle.plate} (${vehicle.type} - ${vehicle.color}) at ${videoDet.formattedTime}. Speed: ${videoDet.speed} km/h.`,
          status: 'ACTIVE',
          actionRequired: 'Review video evidence and notify patrol unit'
        };
        this.alerts.unshift(alertItem);

        this.latestEventToast = {
          title: `Watchlist Vehicle Detected!`,
          message: `${vehicle.plate} detected in video stream (${videoDet.formattedTime})`,
          type: 'critical',
          targetPlate: vehicle.plate
        };
        this.lastToastTimestamp = Date.now();
      }
    }

    // If violation detected in video, record it
    if (videoDet.violation) {
      const viol = this.recordVideoViolation({
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        cameraCode: cameraCode,
        location: location,
        timestamp: isoTime,
        violationType: videoDet.violation.type,
        speedLimit: videoDet.violation.type === 'Speeding' ? 60 : undefined,
        recordedSpeed: videoDet.violation.type === 'Speeding' ? videoDet.speed : undefined,
        fineAmount: videoDet.violation.challanAmount,
        confidence: videoDet.confidence,
        vehicleType: videoDet.vehicleType,
        vehicleColor: videoDet.vehicleColor,
        evidenceImage: videoDet.snapshotUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
        notes: `Detected in uploaded video at timestamp ${videoDet.formattedTime}. ${videoDet.violation.description}`
      });
      newDetection.violationId = viol.id;
    }

    this.savePersistedCustomData();
    this.notify();
    return newDetection;
  }

  public recordVideoViolation(violationData: Omit<Violation, 'id' | 'challanNumber' | 'status'>): Violation {
    // Check if violation already exists for plate within last 10s
    const cleanPlate = violationData.plate.toUpperCase().trim().replace(/[\s-]/g, '');
    const existing = this.violations.find(v => {
      if (v.plate.toUpperCase().replace(/[\s-]/g, '') !== cleanPlate) return false;
      if (v.violationType !== violationData.violationType) return false;
      const diffSec = (Date.now() - new Date(v.timestamp).getTime()) / 1000;
      return diffSec >= 0 && diffSec < 10;
    });
    if (existing) {
      return existing;
    }

    const newViol: Violation = {
      ...violationData,
      id: `viol-vid-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      challanNumber: `BLR-VID-${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'New'
    };

    this.violations.unshift(newViol);

    // Update vehicle violationsCount
    const vehicle = this.getVehicleByPlate(newViol.plate);
    if (vehicle) {
      vehicle.violationsCount += 1;
      if (vehicle.violationsCount >= 3 && vehicle.riskLevel === 'Low') {
        vehicle.riskLevel = 'Medium';
      }
    }

    // Update matching camera if exists
    const cam = this.cameras.find(c => c.code === newViol.cameraCode);
    if (cam) {
      cam.violationsToday += 1;
    }

    this.notify();
    return newViol;
  }

  public updateVehicleDetails(plate: string, updates: Partial<Vehicle>): Vehicle | null {
    const vehicle = this.getVehicleByPlate(plate);
    if (!vehicle) return null;

    Object.assign(vehicle, updates);
    this.savePersistedCustomData();
    this.notify();
    return vehicle;
  }

  public getAutoRegisteredVehicles(): Vehicle[] {
    return this.vehicles.filter(v => v.id.startsWith('veh-') || (v as any).isAutoRegistered);
  }

  public isPlateRegistered(plate: string): boolean {
    const clean = plate.toUpperCase().trim().replace(/[\s-]/g, '');
    return this.vehicles.some(v => v.plate.toUpperCase().replace(/[\s-]/g, '') === clean);
  }

  public exportRegisteredVehiclesJson(): string {
    const custom = this.getAutoRegisteredVehicles();
    return JSON.stringify(custom, null, 2);
  }

  public exportRegisteredVehiclesCsv(): string {
    const custom = this.getAutoRegisteredVehicles();
    const headers = ['Plate', 'Type', 'Color', 'Owner', 'State', 'Sightings', 'Violations', 'RiskLevel', 'FirstSeen', 'LastSeen'];
    const rows = custom.map(v => [
      v.plate,
      v.type,
      v.color,
      `"${v.registeredOwner || ''}"`,
      `"${v.registeredState || ''}"`,
      v.sightingsCount,
      v.violationsCount,
      v.riskLevel,
      v.firstSeen,
      v.lastSeen
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }


  // Theme Management
  public getTheme(): 'dark' | 'light' {
    return this.theme;
  }

  public setTheme(theme: 'dark' | 'light') {
    this.theme = theme;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('citywatch_theme', theme);
    }
    this.notify();
  }

  public toggleTheme(): 'dark' | 'light' {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
    return next;
  }
}

export const trafficStore = new TrafficStoreService();
