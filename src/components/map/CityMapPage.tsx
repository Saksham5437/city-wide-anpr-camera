import React, { useState } from 'react';
import { Camera, CityZone } from '../../types';
import { CityMapLeaflet } from './CityMapLeaflet';
import { CCTVFeedSimulator } from '../cameras/CCTVFeedSimulator';
import { 
  MapPin, 
  Layers, 
  Video, 
  Activity, 
  Radio, 
  ShieldAlert, 
  Maximize2, 
  X, 
  Route, 
  Filter 
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { trafficStore } from '../../services/trafficStore';

interface CityMapPageProps {
  cameras: Camera[];
  onNavigate: (tab: NavTab, meta?: any) => void;
  initialSelectedCamera?: Camera | null;
}

export const CityMapPage: React.FC<CityMapPageProps> = ({
  cameras,
  onNavigate,
  initialSelectedCamera = null
}) => {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(initialSelectedCamera);
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedFilter, setSelectedFilter] = useState<string>('All Cameras');
  const [showCongestion, setShowCongestion] = useState<boolean>(true);
  const [showAllCameras, setShowAllCameras] = useState<boolean>(true);

  const isDark = trafficStore.getTheme() === 'dark';
  const zones: (CityZone | 'All')[] = ['All', 'Central', 'North', 'South', 'East', 'West', 'Tech Corridor'];
  const filterOptions = ['All Cameras', 'Online', 'Offline', 'Maintenance'];

  const filteredCameras = cameras.filter(cam => {
    const matchZone = selectedZone === 'All' || cam.zone === selectedZone;
    let matchStatus = true;
    if (selectedFilter === 'Online') matchStatus = cam.status === 'ONLINE';
    else if (selectedFilter === 'Offline') matchStatus = cam.status === 'OFFLINE';
    else if (selectedFilter === 'Maintenance') matchStatus = cam.status === 'MAINTENANCE';

    return matchZone && matchStatus;
  });

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto h-[calc(100vh-4.5rem)] flex flex-col">
      {/* Map Control Bar */}
      <div className={`${cardBg} border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <h2 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>
              Bengaluru City ANPR Camera Grid
            </h2>
          </div>
          <span className={`text-xs font-mono hidden sm:inline ${textMuted}`}>
            ({filteredCameras.length} Nodes)
          </span>
        </div>

        {/* Filters & Layer Toggles */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            {filterOptions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedFilter(opt)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-colors border ${
                  selectedFilter === opt
                    ? isDark ? 'bg-neutral-800 text-white border-neutral-600 font-bold' : 'bg-slate-900 text-white border-slate-900 font-bold'
                    : isDark ? 'bg-black text-neutral-400 border-neutral-800 hover:bg-neutral-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Zone Selector */}
          <div className="flex items-center gap-1.5">
            <span className={textMuted}>Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className={`rounded-xl px-2.5 py-1 text-xs font-mono focus:outline-none border ${
                isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {zones.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Layer Switches */}
          <label className={`flex items-center gap-1.5 cursor-pointer select-none font-sans ${
            isDark ? 'text-neutral-300' : 'text-slate-700'
          }`}>
            <input
              type="checkbox"
              checked={showCongestion}
              onChange={(e) => setShowCongestion(e.target.checked)}
              className="rounded border-neutral-700 text-emerald-600 focus:ring-0"
            />
            <span>Congestion Heat Rings</span>
          </label>

          <button
            type="button"
            onClick={() => onNavigate('tracking', { plate: 'KA01AB1234' })}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors flex items-center gap-1 font-bold border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Overlay Trajectory</span>
          </button>
        </div>
      </div>

      {/* Main Map Container with Side Camera Drawer */}
      <div className={`flex-1 relative rounded-2xl overflow-hidden border min-h-[450px] shadow-2xl ${
        isDark ? 'border-neutral-800' : 'border-slate-200'
      }`}>
        <CityMapLeaflet 
          cameras={filteredCameras}
          selectedCamera={selectedCamera}
          onSelectCamera={(cam) => setSelectedCamera(cam)}
          showCongestionLayers={showCongestion}
          showAllCameras={showAllCameras}
        />

        {/* Selected Camera Slide-Over Inspector Drawer */}
        {selectedCamera && (
          <div className={`absolute top-3.5 right-3.5 bottom-3.5 w-80 sm:w-96 rounded-2xl shadow-2xl p-4 flex flex-col justify-between z-1000 animate-in slide-in-from-right duration-200 border backdrop-blur-md ${
            isDark ? 'bg-neutral-950/95 border-neutral-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}>
            <div className="space-y-3 overflow-y-auto">
              <div className={`flex items-center justify-between pb-2.5 border-b ${
                isDark ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-500" />
                  <span className={`font-mono font-bold text-sm ${textTitle}`}>{selectedCamera.code}</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    selectedCamera.status === 'ONLINE' || (selectedCamera.status as string) === 'LIVE' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' : selectedCamera.status === 'OFFLINE' ? 'bg-red-500/15 text-red-500 border-red-500/30' : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                  }`}>
                    ● {selectedCamera.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCamera(null)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className={`text-xs font-bold font-sans ${textTitle}`}>{selectedCamera.name}</h4>
                <p className={`text-[11px] font-mono mt-0.5 ${textMuted}`}>
                  {selectedCamera.location} • {selectedCamera.zone} Zone
                </p>
              </div>

              {/* Live Preview Feed */}
              <div className="p-1.5 bg-black rounded-xl border border-neutral-800">
                <CCTVFeedSimulator camera={selectedCamera} height="150px" interactive={false} />
              </div>

              {/* Telemetry Metrics */}
              <div className={`p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={textMuted}>Traffic Density:</span>
                  <span className="font-bold text-amber-500">{selectedCamera.trafficLevel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={textMuted}>Throughput:</span>
                  <span className={`font-bold ${textTitle}`}>{selectedCamera.vehiclesPerMin} veh/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={textMuted}>Last Detected:</span>
                  <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-lg font-bold border border-amber-500/30">
                    {selectedCamera.lastDetectedPlate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={textMuted}>Violations Today:</span>
                  <span className="text-red-500 font-bold">{selectedCamera.violationsToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={textMuted}>Avg Speed:</span>
                  <span className={`font-bold ${textTitle}`}>{selectedCamera.avgSpeed} km/h</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className={`pt-3 border-t space-y-2 font-sans ${
              isDark ? 'border-neutral-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => onNavigate('cameras', { selectedCamera })}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow border ${
                  isDark 
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                }`}
              >
                Open Full Screen Camera Feed
              </button>
              <button
                type="button"
                onClick={() => onNavigate('tracking', { plate: selectedCamera.lastDetectedPlate })}
                className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors border ${
                  isDark 
                    ? 'bg-black hover:bg-neutral-900 border-neutral-800 text-neutral-300' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                Track Last Detected Vehicle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
