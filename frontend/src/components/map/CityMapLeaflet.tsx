import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Camera, TrajectoryPoint, TrajectoryRoute, IntersectionStats } from '../../types';
import { INTERSECTION_STATS } from '../../data/bengaluruData';
import { 
  Layers, 
  Plus, 
  Minus, 
  Crosshair, 
  ChevronDown, 
  Route, 
  Clock, 
  Camera as CameraIcon, 
  Gauge, 
  CheckCircle2, 
  ShieldAlert,
  Moon,
  Sun,
  Globe
} from 'lucide-react';
import { trafficStore } from '../../services/trafficStore';

export type MapLayerKey = 'google-dark' | 'google-streets' | 'google-satellite';

interface MapLayerConfig {
  key: MapLayerKey;
  label: string;
  category: 'dark' | 'light' | 'satellite';
  url: () => string;
  className?: string;
  attribution: string;
}

const MAP_LAYERS: MapLayerConfig[] = [
  {
    key: 'google-dark',
    label: 'Google Maps Dark',
    category: 'dark',
    url: () => 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    className: 'leaflet-google-dark-layer',
    attribution: '© Google Maps'
  },
  {
    key: 'google-streets',
    label: 'Google Maps Standard',
    category: 'light',
    url: () => 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '© Google Maps'
  },
  {
    key: 'google-satellite',
    label: 'Google Maps Satellite',
    category: 'satellite',
    url: () => 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '© Google Maps'
  }
];

interface CityMapLeafletProps {
  cameras: Camera[];
  selectedCamera?: Camera | null;
  onSelectCamera?: (camera: Camera) => void;
  trajectory?: TrajectoryRoute | null;
  activePlaybackIndex?: number;
  height?: string;
  showCongestionLayers?: boolean;
  showAllCameras?: boolean;
  center?: [number, number];
  zoom?: number;
}

export const CityMapLeaflet: React.FC<CityMapLeafletProps> = ({
  cameras,
  selectedCamera,
  onSelectCamera,
  trajectory,
  activePlaybackIndex = 0,
  height = '100%',
  showCongestionLayers = true,
  showAllCameras = true,
  center = [12.9716, 77.5946],
  zoom = 12
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const trajectoryLayerRef = useRef<L.LayerGroup | null>(null);
  const congestionLayerRef = useRef<L.LayerGroup | null>(null);
  const vehiclePlaybackMarkerRef = useRef<L.Marker | null>(null);

  const isDark = trafficStore.getTheme() === 'dark';
  const defaultLayer: MapLayerKey = isDark ? 'google-dark' : 'google-streets';
  const [activeLayerKey, setActiveLayerKey] = useState<MapLayerKey>(defaultLayer);
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false
    });

    const activeConfig = MAP_LAYERS.find(l => l.key === activeLayerKey) || MAP_LAYERS[0];
    const initialUrl = activeConfig.url();

    const tileLayer = L.tileLayer(initialUrl, {
      maxZoom: 20,
      className: activeConfig.className || '',
      attribution: activeConfig.attribution
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    trajectoryLayerRef.current = L.layerGroup().addTo(map);
    congestionLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on Layer Key Change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const config = MAP_LAYERS.find(l => l.key === activeLayerKey) || MAP_LAYERS[0];
    const newUrl = config.url();

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(newUrl, {
      maxZoom: 20,
      className: config.className || '',
      attribution: config.attribution
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [activeLayerKey]);

  // Sync theme changes with default map layer
  useEffect(() => {
    const preferredKey: MapLayerKey = isDark ? 'google-dark' : 'google-streets';
    setActiveLayerKey(preferredKey);
  }, [isDark]);

  // Update Congestion Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const congestionLayer = congestionLayerRef.current;
    if (!map || !congestionLayer) return;

    congestionLayer.clearLayers();

    if (showCongestionLayers) {
      INTERSECTION_STATS.forEach(stat => {
        const color = 
          stat.trafficLevel === 'Critical' ? '#ef4444' :
          stat.trafficLevel === 'Heavy' ? '#f97316' :
          stat.trafficLevel === 'Moderate' ? '#f59e0b' : '#10b981';

        const circle = L.circle([stat.lat, stat.lng], {
          color,
          fillColor: color,
          fillOpacity: 0.22,
          radius: stat.queueLengthMeters * 2.5,
          weight: 2
        });

        circle.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-bottom: 2px;">${stat.name}</div>
            <div style="font-size: 11px; color: #94a3b8;">Zone: ${stat.zone} | Level: <b style="color: ${color}">${stat.trafficLevel.toUpperCase()}</b></div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
              Queue: <b>${stat.queueLengthMeters}m</b> | Vol: <b>${stat.vehiclesPerMin} veh/min</b> | Avg Speed: <b>${stat.avgSpeedKmh} km/h</b>
            </div>
          </div>
        `);

        congestionLayer.addLayer(circle);
      });
    }
  }, [showCongestionLayers]);

  // Update Camera Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (!showAllCameras && !selectedCamera) return;

    const camsToRender = selectedCamera ? [selectedCamera] : cameras;

    camsToRender.forEach(cam => {
      const isSelected = selectedCamera?.id === cam.id || selectedCamera?.code === cam.code;
      const statusColor = (cam.status === 'ONLINE' || (cam.status as string) === 'LIVE') ? '#10b981' : (cam.status === 'OFFLINE' ? '#ef4444' : '#f59e0b');

      const customIcon = L.divIcon({
        className: 'custom-camera-marker',
        html: `
          <div style="
            width: ${isSelected ? '32px' : '22px'};
            height: ${isSelected ? '32px' : '22px'};
            background: #090d16;
            border: 2px solid ${isSelected ? '#3b82f6' : statusColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 12px rgba(0,0,0,0.8);
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <div style="
              width: ${isSelected ? '10px' : '7px'};
              height: ${isSelected ? '10px' : '7px'};
              background: ${statusColor};
              border-radius: 50%;
            "></div>
          </div>
        `,
        iconSize: [isSelected ? 32 : 22, isSelected ? 32 : 22],
        iconAnchor: [isSelected ? 16 : 11, isSelected ? 16 : 11]
      });

      const marker = L.marker([cam.lat, cam.lng], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 180px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #38bdf8;">${cam.code}</span>
            <span style="font-size: 10px; font-weight: 700; color: ${statusColor};">${cam.status}</span>
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #f8fafc;">${cam.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${cam.location} (${cam.zone})</div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px; border-top: 1px solid #243462; padding-top: 4px;">
            Throughput: <b>${cam.vehiclesPerMin} veh/min</b> | Speed: <b>${cam.avgSpeed} km/h</b>
          </div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectCamera) onSelectCamera(cam);
      });

      markersLayer.addLayer(marker);
    });
  }, [cameras, selectedCamera, showAllCameras, onSelectCamera]);

  // Render Trajectory Polyline & Sequential Sighting Nodes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trajectoryLayer = trajectoryLayerRef.current;
    if (!map || !trajectoryLayer) return;

    trajectoryLayer.clearLayers();

    if (!trajectory || trajectory.points.length === 0) return;

    const latlngs: [number, number][] = trajectory.points.map(p => [p.lat, p.lng]);

    // Outer Glow Polyline
    const routeLineGlow = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 8,
      opacity: 0.35
    });

    // Vibrant Solid Polyline
    const routeLine = L.polyline(latlngs, {
      color: '#2563eb',
      weight: 4,
      opacity: 0.95
    });

    trajectoryLayer.addLayer(routeLineGlow);
    trajectoryLayer.addLayer(routeLine);

    // Sequential Sighting Nodes (1, 2, 6, 7, 8, 9, etc.)
    trajectory.points.forEach((point, idx) => {
      const isViol = point.violationDetected;
      const nodeBorder = isViol ? '#ef4444' : '#2563eb';
      const nodeBg = isViol ? '#450a0a' : '#1e3a8a';

      const nodeIcon = L.divIcon({
        className: 'trajectory-node-marker',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background: ${nodeBg};
            border: 2.5px solid ${nodeBorder};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.7);
            font-family: 'JetBrains Mono', monospace;
          ">
            ${idx + 1}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const nodeMarker = L.marker([point.lat, point.lng], { icon: nodeIcon });
      const timeStr = new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      nodeMarker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 190px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 700; color: #94a3b8;">NODE ${idx + 1} OF ${trajectory.points.length}</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #38bdf8;">${point.cameraCode}</span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #f8fafc; margin-top: 2px;">${point.location}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Timestamp: <b style="color: #e2e8f0;">${timeStr}</b></div>
          <div style="font-size: 11px; color: #94a3b8;">Speed: <b style="color: #e2e8f0;">${point.speed} km/h</b> | ANPR: <b style="color: #10b981;">${point.confidence}%</b></div>
          ${isViol ? `
            <div style="margin-top: 6px; padding: 4px 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; font-size: 11px; font-weight: 700; color: #fca5a5;">
              ⚠️ VIOLATION: ${point.violationType || 'Traffic Offense'}
            </div>
          ` : ''}
        </div>
      `);

      trajectoryLayer.addLayer(nodeMarker);
    });

    // Fit map bounds
    map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });
  }, [trajectory]);

  // Moving Vehicle Animation on Active Step
  useEffect(() => {
    const map = mapInstanceRef.current;
    const trajectoryLayer = trajectoryLayerRef.current;
    if (!map || !trajectoryLayer || !trajectory || activePlaybackIndex === undefined) return;

    if (vehiclePlaybackMarkerRef.current) {
      trajectoryLayer.removeLayer(vehiclePlaybackMarkerRef.current);
      vehiclePlaybackMarkerRef.current = null;
    }

    const currentPt = trajectory.points[activePlaybackIndex];
    if (!currentPt) return;

    const carIcon = L.divIcon({
      className: 'vehicle-playback-marker',
      html: `
        <div style="
          width: 38px;
          height: 38px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px #3b82f6;
          position: relative;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const marker = L.marker([currentPt.lat, currentPt.lng], { icon: carIcon, zIndexOffset: 1000 });
    marker.addTo(trajectoryLayer);
    vehiclePlaybackMarkerRef.current = marker;

    map.panTo([currentPt.lat, currentPt.lng], { animate: true, duration: 0.4 });
  }, [trajectory, activePlaybackIndex]);

  // Controls Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    if (trajectory && trajectory.points.length > 0) {
      const latlngs: [number, number][] = trajectory.points.map(p => [p.lat, p.lng]);
      mapInstanceRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });
    } else {
      mapInstanceRef.current.setView(center, zoom);
    }
  };

  // Card theme classes
  const floatingCardBg = isDark ? 'bg-neutral-950/90 border-neutral-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden select-none">
      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: height }} />

      {/* TOP RIGHT: Map Type / Layer Selector (Matching reference design) */}
      <div className="absolute top-3.5 right-3.5 z-1000 pointer-events-auto">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border backdrop-blur-md shadow-xl flex items-center gap-2 transition-all ${floatingCardBg} hover:border-neutral-600`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Map Type</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showLayerMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Layer Options Dropdown */}
          {showLayerMenu && (
            <div className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-1000 backdrop-blur-xl ${floatingCardBg}`}>
              <div className={`px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${textMuted} border-b ${dividerBorder} mb-1`}>
                Viewing Basemaps
              </div>
              <div className="space-y-1 font-mono text-xs">
                {MAP_LAYERS.map(layer => (
                  <button
                    key={layer.key}
                    type="button"
                    onClick={() => {
                      setActiveLayerKey(layer.key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                      activeLayerKey === layer.key
                        ? isDark ? 'bg-neutral-800 text-white font-bold' : 'bg-slate-900 text-white font-bold'
                        : isDark ? 'text-neutral-300 hover:bg-neutral-900' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {layer.category === 'dark' ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : layer.category === 'satellite' ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{layer.label}</span>
                    </div>
                    {activeLayerKey === layer.key && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM LEFT: Radar Legend Overlay (Matching reference design) */}
      <div className={`absolute bottom-3.5 left-3.5 p-3.5 rounded-2xl border z-1000 shadow-2xl backdrop-blur-md font-mono text-xs pointer-events-auto flex flex-col gap-2 ${floatingCardBg}`}>
        <span className="font-bold text-[11px] uppercase tracking-wider">
          BENGALURU GIS RADAR
        </span>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span className={textMuted}>Live ANPR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs" />
            <span className={textMuted}>Offline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
            <span className={textMuted}>Trajectory Node</span>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: Sleek Floating Zoom & Locate Controls (Matching reference design) */}
      <div className="absolute bottom-3.5 right-3.5 z-1000 pointer-events-auto flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${floatingCardBg} hover:scale-105`}
          title="Center on Route / Vehicle"
        >
          <Crosshair className="w-4 h-4 text-blue-500" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${floatingCardBg} hover:scale-105`}
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xl transition-all ${floatingCardBg} hover:scale-105`}
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
