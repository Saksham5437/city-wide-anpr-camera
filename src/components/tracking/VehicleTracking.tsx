import React, { useState, useEffect } from 'react';
import { TrajectoryRoute, Vehicle, Camera } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { CityMapLeaflet } from '../map/CityMapLeaflet';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Route, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  Gauge, 
  ArrowRight, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  Car,
  Sliders,
  ChevronDown,
  Activity,
  Zap
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface VehicleTrackingProps {
  initialPlate?: string;
  onNavigate: (tab: NavTab, meta?: any) => void;
}

export const VehicleTracking: React.FC<VehicleTrackingProps> = ({
  initialPlate = 'KA01AB1234',
  onNavigate
}) => {
  const [selectedPlate, setSelectedPlate] = useState<string>(initialPlate);
  const [trajectory, setTrajectory] = useState<TrajectoryRoute | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [searchPlateInput, setSearchPlateInput] = useState<string>(initialPlate);

  const allVehicles = trafficStore.getVehicles();
  const allCameras = trafficStore.getCameras();
  const isDark = trafficStore.getTheme() === 'dark';

  useEffect(() => {
    if (selectedPlate) {
      const traj = trafficStore.getVehicleTrajectory(selectedPlate);
      setTrajectory(traj);
      setActiveStepIndex(0);
      setIsPlaying(false);
    }
  }, [selectedPlate]);

  // Journey Playback Animation Timer
  useEffect(() => {
    if (!isPlaying || !trajectory || trajectory.points.length === 0) return;

    const intervalDuration = Math.max(400, 2000 / playbackSpeed);

    const timer = setInterval(() => {
      setActiveStepIndex(prev => {
        if (prev >= trajectory.points.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalDuration);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, trajectory]);

  const handleSelectVehicle = (plate: string) => {
    setSelectedPlate(plate);
    setSearchPlateInput(plate);
  };

  const handlePlayPause = () => {
    if (!trajectory) return;
    if (activeStepIndex >= trajectory.points.length - 1) {
      setActiveStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevStep = () => {
    setActiveStepIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextStep = () => {
    if (!trajectory) return;
    setActiveStepIndex(prev => Math.min(trajectory.points.length - 1, prev + 1));
  };

  const handleReset = () => {
    setActiveStepIndex(0);
    setIsPlaying(false);
  };

  const currentPoint = trajectory?.points[activeStepIndex];

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Vehicle Switcher */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
              Multi-Camera Trajectory Reconstruction
            </h2>
          </div>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Automated spatio-temporal route synthesis connecting non-contiguous ANPR optical detections across Bengaluru.
          </p>
        </div>

        {/* Target Vehicle Selector */}
        <div className="flex items-center gap-2.5">
          <div className={`${cardBg} px-3.5 py-1.5 rounded-2xl border flex items-center gap-2`}>
            <span className={`text-xs font-mono font-medium ${textMuted}`}>Target:</span>
            <select
              value={selectedPlate}
              onChange={(e) => handleSelectVehicle(e.target.value)}
              className={`border rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-amber-500 focus:outline-none ${
                isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="KA01AB1234">KA01AB1234 (Toyota Fortuner - 8 Sightings)</option>
              <option value="KA05XY7812">KA05XY7812 (Hyundai Creta - 5 Sightings)</option>
              <option value="KA03MN4521">KA03MN4521 (RE Classic 350 - 6 Sightings)</option>
              <option value="KA41P9821">KA41P9821 (BMTC Bus - 12 Sightings)</option>
              <option value="KA51MD3029">KA51MD3029 (KTM Duke - 4 Sightings)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('search', { query: selectedPlate })}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
            }`}
          >
            Vehicle Profile
          </button>
        </div>
      </div>

      {trajectory ? (
        <>
          {/* Trajectory Key Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Target Plate</div>
              <div className="text-base font-bold text-amber-500 mt-0.5">{trajectory.plate}</div>
              <div className={`text-[10px] font-sans ${textMuted}`}>{trajectory.vehicleType} • {trajectory.vehicleColor}</div>
            </div>

            <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Total Sightings</div>
              <div className={`text-base font-bold mt-0.5 ${textTitle}`}>{trajectory.points.length} Cameras</div>
              <div className="text-[10px] text-emerald-500 font-bold">100% Optical Lock</div>
            </div>

            <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Route Distance</div>
              <div className={`text-base font-bold mt-0.5 ${textTitle}`}>{trajectory.totalDistanceKm} km</div>
              <div className={`text-[10px] ${textMuted}`}>Bengaluru Metro Grid</div>
            </div>

            <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Travel Time</div>
              <div className={`text-base font-bold mt-0.5 ${textTitle}`}>
                {Math.floor(trajectory.totalTravelTimeMinutes / 60)}h {trajectory.totalTravelTimeMinutes % 60}m
              </div>
              <div className={`text-[10px] ${textMuted}`}>Total Duration</div>
            </div>

            <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Average Speed</div>
              <div className="text-base font-bold text-amber-500 mt-0.5">{trajectory.avgSpeedKmh} km/h</div>
              <div className={`text-[10px] ${textMuted}`}>Peak {trajectory.fastestSegmentKmh} km/h</div>
            </div>

            <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Re-ID Match</div>
              <div className="text-base font-bold text-emerald-500 mt-0.5">{trajectory.reIdConfidence}%</div>
              <div className={`text-[10px] ${textMuted}`}>Appearance Lock</div>
            </div>
          </div>

          {/* Suspicious Trajectory Warning Banner */}
          {trajectory.suspiciousTrajectory && (
            <div className={`border-2 border-red-500/40 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-mono shadow-md ${
              isDark ? 'bg-red-950/20' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold text-red-500 uppercase">[ANOMALOUS TRAJECTORY FLAGGED]: </span>
                  <span className={`font-sans ${textTitle}`}>{trajectory.suspiciousReason}</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-600 text-white font-bold rounded-xl text-[11px] shrink-0 shadow">
                CRITICAL THREAT
              </span>
            </div>
          )}

          {/* Main Content: Leaflet Map (Left) + Route Step Telemetry (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Interactive Map with Trajectory & Playback */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`h-[500px] relative rounded-2xl overflow-hidden border shadow-2xl ${
                isDark ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <CityMapLeaflet 
                  cameras={allCameras}
                  trajectory={trajectory}
                  activePlaybackIndex={activeStepIndex}
                  showCongestionLayers={false}
                  showAllCameras={false}
                />
              </div>

              {/* Bottom Floating/Docked Summary Stats Bar (Matching reference design) */}
              <div className={`${cardBg} border rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono shadow-xl`}>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/30">
                    <Route className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>TOTAL DISTANCE</div>
                    <div className={`text-sm font-extrabold font-sans mt-0.5 ${textTitle}`}>{trajectory.totalDistanceKm} km</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>TOTAL TRAVEL TIME</div>
                    <div className={`text-sm font-extrabold font-sans mt-0.5 ${textTitle}`}>
                      {Math.floor(trajectory.totalTravelTimeMinutes / 60)}h {trajectory.totalTravelTimeMinutes % 60}m
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-500 border border-purple-500/30">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>CAMERAS CROSSED</div>
                    <div className={`text-sm font-extrabold font-sans mt-0.5 ${textTitle}`}>{trajectory.points.length}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    <Gauge className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>AVERAGE SPEED</div>
                    <div className={`text-sm font-extrabold font-sans mt-0.5 ${textTitle}`}>{trajectory.avgSpeedKmh} km/h</div>
                  </div>
                </div>
              </div>

              {/* Journey Playback Control Bar */}
              <div className={`${cardBg} border rounded-2xl p-4 space-y-3 font-mono`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Playback Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className={`p-2 rounded-xl border transition-colors ${
                        isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                      title="Reset to Start"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={activeStepIndex === 0}
                      className={`p-2 disabled:opacity-30 rounded-xl border transition-colors ${
                        isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                      title="Previous Camera"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handlePlayPause}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow border ${
                        isDark 
                          ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'PAUSE JOURNEY' : 'PLAY JOURNEY'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={activeStepIndex >= trajectory.points.length - 1}
                      className={`p-2 disabled:opacity-30 rounded-xl border transition-colors ${
                        isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                      title="Next Camera"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playback Speed Controls */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`font-semibold ${textMuted}`}>Speed:</span>
                    {([1, 2, 5] as const).map(spd => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          playbackSpeed === spd 
                            ? isDark ? 'bg-neutral-800 text-white border-neutral-600' : 'bg-slate-900 text-white border-slate-900'
                            : isDark ? 'bg-black text-neutral-400 border-neutral-800 hover:bg-neutral-900' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeline Slider Scrubber */}
                <div className="space-y-1">
                  <div className={`flex items-center justify-between text-[11px] ${textMuted}`}>
                    <span>Step {activeStepIndex + 1} of {trajectory.points.length}: {currentPoint?.cameraCode}</span>
                    <span>{new Date(currentPoint?.timestamp || '').toLocaleTimeString('en-US')}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={trajectory.points.length - 1}
                    value={activeStepIndex}
                    onChange={(e) => {
                      setActiveStepIndex(Number(e.target.value));
                      setIsPlaying(false);
                    }}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-neutral-700 bg-neutral-800"
                  />
                </div>
              </div>
            </div>

            {/* Right Col: Multi-Camera Transition Analysis & Re-ID Cards */}
            <div className="space-y-4">
              {/* Vehicle Re-ID Intelligence Card */}
              <div className={`${cardBg} border rounded-2xl p-5`}>
                <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>AI Re-ID Matching</h3>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-lg border border-emerald-500/30 font-bold">
                    {trajectory.reIdConfidence}% Score
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs font-mono">
                  <p className={`text-[11px] font-sans ${textMuted}`}>
                    Deep multi-modal visual embeddings confirm identical vehicle across all {trajectory.points.length} nodes:
                  </p>
                  <div className={`p-3.5 rounded-xl border space-y-1.5 ${
                    isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={textMuted}>Plate OCR Match:</span>
                      <span className="text-emerald-500 font-bold">99.2%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={textMuted}>Appearance Profile:</span>
                      <span className="text-emerald-500 font-bold">96.5% (White SUV)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={textMuted}>Kinematic Validity:</span>
                      <span className="text-emerald-500 font-bold">98.0% (Valid Path)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sequential Route Transition Segments */}
              <div className={`${cardBg} border rounded-2xl p-5`}>
                <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Segment Telemetry</h3>
                  <span className={`text-xs font-mono ${textMuted}`}>{trajectory.segments.length} Transitions</span>
                </div>

                <div className={`mt-3 divide-y max-h-72 overflow-y-auto space-y-1.5 font-mono text-xs ${dividerBorder}`}>
                  {[...trajectory.segments].reverse().map((seg, revIdx) => {
                    const originalIdx = trajectory.segments.length - 1 - revIdx;
                    const isLatest = revIdx === 0;
                    const crossedTimestamp = trajectory.points[originalIdx + 1]?.timestamp;

                    // Calculate elapsed minutes / hours since crossing that junction
                    const getElapsedCrossingTime = (ts?: string) => {
                      if (!ts) return `${seg.timeMinutes}m ago`;
                      const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
                      if (diffMinutes < 60) return `${diffMinutes}m ago`;
                      const hours = Math.floor(diffMinutes / 60);
                      const remMins = diffMinutes % 60;
                      return remMins === 0 ? `${hours}h ago` : `${hours}h ${remMins}m ago`;
                    };

                    const elapsedStr = getElapsedCrossingTime(crossedTimestamp);

                    return (
                      <div 
                        key={originalIdx}
                        onClick={() => setActiveStepIndex(originalIdx + 1)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          activeStepIndex === originalIdx + 1 
                            ? isDark ? 'bg-neutral-900 border-l-2 border-emerald-400' : 'bg-slate-100 border-l-2 border-slate-900' 
                            : isDark ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${textTitle}`}>{seg.fromCamera} → {seg.toCamera}</span>
                            {isLatest && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                LATEST
                              </span>
                            )}
                          </div>
                          <span className="text-emerald-500 font-bold">{seg.reIdScore}% Match</span>
                        </div>
                        <div className={`text-[11px] font-sans mt-1 ${textMuted}`}>
                          {seg.fromLocation} → {seg.toLocation}
                        </div>
                        <div className={`flex items-center justify-between text-[10px] mt-1.5 pt-1.5 border-t ${dividerBorder} ${textMuted}`}>
                          <span>Distance Covered: <b className={textTitle}>{seg.distanceKm} km</b></span>
                          <span>Crossed: <b className={isLatest ? "text-emerald-400 font-bold" : textTitle}>{elapsedStr}</b></span>
                          <span>Avg Speed: <b className="text-amber-500">{seg.avgSpeedKmh} km/h</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={`${cardBg} border rounded-2xl p-12 text-center space-y-3 font-mono`}>
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <div className={`text-base font-bold font-sans ${textTitle}`}>No Trajectory Found for Plate "{selectedPlate}"</div>
          <p className={`text-xs max-w-md mx-auto font-sans ${textMuted}`}>
            Target vehicle does not have sufficient multi-camera interceptions logged today. Please select another vehicle or search records.
          </p>
          <button
            type="button"
            onClick={() => handleSelectVehicle('KA01AB1234')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all shadow border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            Track Vehicle: KA01AB1234
          </button>
        </div>
      )}
    </div>
  );
};
