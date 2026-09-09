import React, { useState } from 'react';
import { Vehicle, Detection, Violation } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  ArrowLeft, 
  Route, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  Clock, 
  Car, 
  User, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Camera as CameraIcon,
  ChevronRight,
  BookmarkPlus,
  BookmarkCheck,
  Zap
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface VehicleProfileProps {
  vehicle: Vehicle;
  onBack: () => void;
  onNavigate: (tab: NavTab, meta?: any) => void;
  onInspectViolation: (violation: Violation) => void;
}

export const VehicleProfile: React.FC<VehicleProfileProps> = ({
  vehicle,
  onBack,
  onNavigate,
  onInspectViolation
}) => {
  const detections = trafficStore.getDetectionsByVehicle(vehicle.plate);
  const violations = trafficStore.getViolations().filter(v => v.plate === vehicle.plate);

  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(detections[0] || null);
  const [isWatchlisted, setIsWatchlisted] = useState<boolean>(vehicle.isWatchlisted);

  const isDark = trafficStore.getTheme() === 'dark';

  const handleToggleWatchlist = () => {
    if (isWatchlisted) {
      const item = trafficStore.getWatchlist().find(w => w.plate === vehicle.plate);
      if (item) trafficStore.removeFromWatchlist(item.id);
      setIsWatchlisted(false);
    } else {
      trafficStore.addToWatchlist({
        plate: vehicle.plate,
        vehicleType: vehicle.type,
        color: vehicle.color,
        reason: 'Operator manual flag from Vehicle Profile investigation',
        priority: 'High',
        addedBy: 'TMC Surveillance Unit',
        notes: 'Monitored across urban traffic corridors',
        isActive: true
      });
      setIsWatchlisted(true);
    }
  };

  const riskBadge = 
    vehicle.riskLevel === 'Critical' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
    vehicle.riskLevel === 'High' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
    vehicle.riskLevel === 'Medium' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
    'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`p-2.5 rounded-xl border transition-colors ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Back to Search"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-mono font-bold text-amber-500 tracking-widest">
                {vehicle.plate}
              </span>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${riskBadge}`}>
                {vehicle.riskLevel.toUpperCase()} RISK
              </span>
              {isWatchlisted && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>WATCHLISTED</span>
                </span>
              )}
            </div>
            <p className={`text-xs font-sans mt-1 ${textMuted}`}>
              {vehicle.makeModel} • {vehicle.color} • {vehicle.registeredState}
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleWatchlist}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              isWatchlisted
                ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                : isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            {isWatchlisted ? <BookmarkCheck className="w-3.5 h-3.5 text-red-500" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
            <span>{isWatchlisted ? 'Remove Watchlist' : 'Add to Watchlist'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tracking', { plate: vehicle.plate })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Track on Multi-Camera Map</span>
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
          <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Vehicle Type</div>
          <div className={`text-sm font-bold mt-1 font-sans ${textTitle}`}>{vehicle.type}</div>
        </div>
        <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
          <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Color</div>
          <div className={`text-sm font-bold mt-1 font-sans ${textTitle}`}>{vehicle.color}</div>
        </div>
        <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
          <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>First Seen</div>
          <div className={`text-sm font-bold mt-1 ${textTitle}`}>{vehicle.firstSeen}</div>
        </div>
        <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
          <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Last Seen</div>
          <div className={`text-sm font-bold mt-1 ${textTitle}`}>{vehicle.lastSeen}</div>
        </div>
        <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
          <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Camera Sightings</div>
          <div className="text-sm font-bold text-emerald-500 mt-1">{detections.length} Nodes</div>
        </div>
        <div className={`${cardBg} border p-3.5 rounded-2xl font-mono text-center`}>
          <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Violations</div>
          <div className="text-sm font-bold text-red-500 mt-1">{violations.length} Offenses</div>
        </div>
      </div>

      {/* RTO Owner Information Bar */}
      <div className={`${cardBg} border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-800'
          }`}>
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-[10px] uppercase font-sans font-semibold ${textMuted}`}>Registered Owner</div>
            <div className={`text-sm font-bold font-sans ${textTitle}`}>{vehicle.registeredOwner}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <div>
            <span className={`block text-[10px] ${textMuted}`}>RTO DIVISION</span>
            <span className={`font-bold ${textTitle}`}>{vehicle.registeredState}</span>
          </div>
          <div>
            <span className={`block text-[10px] ${textMuted}`}>FUEL TYPE</span>
            <span className={`font-bold ${textTitle}`}>{vehicle.fuelType || 'Diesel'}</span>
          </div>
          <div>
            <span className={`block text-[10px] ${textMuted}`}>SURVEILLANCE STATUS</span>
            <span className="font-bold text-emerald-500">ANPR ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Row 2: Chronological Timeline & Sightings Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chronological Timeline */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-5`}>
          <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Multi-Camera Detection Timeline</h3>
              <p className={`text-xs font-sans mt-0.5 ${textMuted}`}>Chronological ANPR sightings across Bengaluru surveillance grid</p>
            </div>
            <span className={`text-xs font-mono ${textMuted}`}>{detections.length} Interceptions</span>
          </div>

          <div className={`mt-6 relative pl-6 border-l-2 space-y-6 ${
            isDark ? 'border-neutral-800' : 'border-slate-200'
          }`}>
            {detections.map((det, idx) => {
              const timeStr = new Date(det.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              const isViol = !!det.violationId || violations.some(v => v.cameraCode === det.cameraCode);
              const isSelected = selectedDetection?.id === det.id;

              return (
                <div 
                  key={det.id} 
                  onClick={() => setSelectedDetection(det)}
                  className={`relative group cursor-pointer p-4 rounded-2xl border transition-all ${
                    isSelected 
                      ? isDark ? 'bg-neutral-900 border-neutral-600' : 'bg-slate-100 border-slate-400 shadow-sm'
                      : isDark ? 'bg-black border-neutral-800 hover:border-neutral-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[33px] top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isDark ? 'border-black' : 'border-white'
                  } ${isViol ? 'bg-red-500' : isDark ? 'bg-white text-black' : 'bg-slate-900 text-white'}`}>
                    <span className="text-[8px] font-bold font-mono">{idx + 1}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-500">{timeStr}</span>
                        <span className="text-neutral-500 font-mono">|</span>
                        <span className={`text-xs font-mono font-bold ${textTitle}`}>{det.cameraCode}</span>
                        <span className={`text-xs font-semibold font-sans ${textTitle}`}>— {det.cameraName}</span>
                      </div>
                      <div className={`text-xs font-mono mt-1 flex items-center gap-3 ${textMuted}`}>
                        <span>Speed: <b className={textTitle}>{det.speed} km/h</b></span>
                        <span>•</span>
                        <span>ANPR Confidence: <b className="text-emerald-500">{det.confidence}%</b></span>
                        <span>•</span>
                        <span>Direction: <b className={textTitle}>{det.direction}</b></span>
                      </div>
                    </div>

                    {isViol && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 text-[10px] font-mono font-bold self-start sm:self-auto flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>VIOLATION</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Selected Sighting Inspection & Violation Card */}
        <div className="space-y-4">
          <div className={`${cardBg} border rounded-2xl p-5`}>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <CameraIcon className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Sighting Evidence</h3>
              </div>
              <span className={`text-[10px] font-mono ${textMuted}`}>{selectedDetection?.cameraCode || 'CAM-003'}</span>
            </div>

            {selectedDetection ? (
              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black">
                  <img 
                    src="https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80" 
                    alt="Vehicle Evidence" 
                    className="w-full h-40 object-cover"
                  />
                  {/* Bounding Box Overlay */}
                  <div className="absolute inset-0 border-2 border-emerald-500 m-4 pointer-events-none flex flex-col justify-between p-2">
                    <div className="bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-md w-fit">
                      {vehicle.plate} | {selectedDetection.confidence}%
                    </div>
                    <div className="bg-black/90 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md self-end border border-amber-500/40">
                      SPEED: {selectedDetection.speed} KM/H
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={`font-sans ${textMuted}`}>Camera:</span>
                    <span className={`font-bold font-sans truncate max-w-[150px] ${textTitle}`}>{selectedDetection.cameraName}</span>
                  </div>
                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={textMuted}>Timestamp:</span>
                    <span className={`font-bold ${textTitle}`}>{new Date(selectedDetection.timestamp).toLocaleTimeString('en-US')}</span>
                  </div>
                  <div className={`flex items-center justify-between py-1 border-b ${dividerBorder}`}>
                    <span className={`font-sans ${textMuted}`}>Lane & Direction:</span>
                    <span className={`font-bold ${textTitle}`}>Lane {selectedDetection.laneNumber} ({selectedDetection.direction})</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className={textMuted}>Re-ID Score:</span>
                    <span className="font-bold text-emerald-500">{selectedDetection.reIdScore || 96.5}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`py-6 text-center text-xs font-mono ${textMuted}`}>Select a timeline sighting to view snapshot.</div>
            )}
          </div>

          {/* Violations Summary */}
          {violations.length > 0 && (
            <div className={`border-2 border-red-500/40 rounded-2xl p-5 ${cardBg}`}>
              <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Active Infractions</h3>
                </div>
                <span className="text-xs font-mono text-red-500 font-bold">{violations.length} Total</span>
              </div>

              <div className="mt-3 space-y-2 font-mono text-xs">
                {violations.map(v => (
                  <div key={v.id} className={`p-3 rounded-xl border flex items-center justify-between ${
                    isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <div className="font-bold text-amber-500 font-sans">{v.violationType}</div>
                      <div className={`text-[10px] font-sans ${textMuted}`}>{v.location} • ₹{v.fineAmount}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectViolation(v)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-sans font-semibold transition-colors shadow"
                    >
                      Inspect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
