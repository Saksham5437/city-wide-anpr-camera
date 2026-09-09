import React, { useState } from 'react';
import { Camera, Detection, Violation, VideoDetection } from '../../types';
import { CCTVFeedSimulator } from './CCTVFeedSimulator';
import { trafficStore } from '../../services/trafficStore';
import { 
  ArrowLeft, 
  Video, 
  Radio, 
  ShieldAlert, 
  MapPin, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Route, 
  Calendar,
  Layers,
  Cpu,
  Zap,
  Upload,
  Film
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface CameraDetailProps {
  camera: Camera;
  onBack: () => void;
  onNavigate: (tab: NavTab, meta?: any) => void;
  onInspectViolation: (violation: Violation) => void;
}

export const CameraDetail: React.FC<CameraDetailProps> = ({
  camera,
  onBack,
  onNavigate,
  onInspectViolation
}) => {
  const detections = trafficStore.getDetectionsByCamera(camera.code);
  const violations = trafficStore.getViolations().filter(v => v.cameraCode === camera.code);

  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(detections[0] || null);
  const [liveVideoDetection, setLiveVideoDetection] = useState<VideoDetection | null>(null);

  const isDark = trafficStore.getTheme() === 'dark';
  const displayPlate = liveVideoDetection?.plate || selectedDetection?.plate || camera.lastDetectedPlate || 'KA01AB1234';
  const activePlate = displayPlate;

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const innerBg = isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Control Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`p-2.5 rounded-xl border transition-colors ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Back to Camera Grid"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-mono font-bold ${textTitle}`}>{camera.code}</span>
              <span className="text-neutral-500">/</span>
              <span className={`text-lg font-bold font-sans ${textTitle}`}>{camera.name}</span>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                camera.status === 'ONLINE' || (camera.status as string) === 'LIVE' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                camera.status === 'OFFLINE' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                'bg-amber-500/15 text-amber-500 border-amber-500/30'
              }`}>
                ● {camera.status}
              </span>
            </div>
            <p className={`text-xs font-mono flex items-center gap-3 mt-1 ${textMuted}`}>
              <span>{camera.location} ({camera.zone} Zone)</span>
              <span>•</span>
              <span>GPS: {camera.lat.toFixed(4)}°N, {camera.lng.toFixed(4)}°E</span>
              <span>•</span>
              <span>IP: {camera.ipAddress}</span>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('map', { camera })}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>Show on Map</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tracking', { plate: activePlate })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow border ${
              isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Track Current Plate</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Feed + Live ANPR Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High-Res Camera Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`${cardBg} border rounded-2xl p-4 shadow-xl`}>
            <div className={`flex items-center justify-between pb-3 mb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>High-Definition Edge Stream</h3>
              </div>
              <div className={`text-xs font-mono flex items-center gap-3 ${textMuted}`}>
                <span>{camera.resolution}</span>
                <span>•</span>
                <span>{camera.fps} FPS</span>
              </div>
            </div>

            {/* Simulated Live Stream / Uploaded Video */}
            <CCTVFeedSimulator 
              camera={camera} 
              targetDetection={selectedDetection} 
              height="380px" 
              interactive={true} 
              allowVideoUpload={true}
              onActiveDetection={(det) => {
                setLiveVideoDetection(det);
              }}
            />
          </div>

          {/* Camera Telemetry Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className={`${cardBg} border p-3 rounded-2xl text-center font-mono`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Vehicles Today</div>
              <div className={`text-lg font-bold mt-0.5 ${textTitle}`}>{camera.vehiclesToday.toLocaleString()}</div>
            </div>
            <div className={`${cardBg} border p-3 rounded-2xl text-center font-mono`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Avg Vol / Hr</div>
              <div className="text-lg font-bold text-emerald-500 mt-0.5">{Math.round(camera.vehiclesToday / 11)}</div>
            </div>
            <div className={`${cardBg} border p-3 rounded-2xl text-center font-mono`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Violations Today</div>
              <div className="text-lg font-bold text-red-500 mt-0.5">{camera.violationsToday}</div>
            </div>
            <div className={`${cardBg} border p-3 rounded-2xl text-center font-mono`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Avg Speed</div>
              <div className="text-lg font-bold text-amber-500 mt-0.5">{camera.avgSpeed} km/h</div>
            </div>
            <div className={`${cardBg} border p-3 rounded-2xl text-center font-mono`}>
              <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Camera Uptime</div>
              <div className="text-lg font-bold text-emerald-500 mt-0.5">{camera.uptime}%</div>
            </div>
          </div>
        </div>

        {/* Right Col: Live ANPR Optical Recognition Card */}
        <div className="space-y-4">
          <div className={`${cardBg} border rounded-2xl p-5`}>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>AI ANPR Recognition</h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border font-bold ${
                liveVideoDetection
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
                  : isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                {liveVideoDetection ? 'VIDEO OCR ACTIVE' : 'YOLOv8 + OCR'}
              </span>
            </div>

            {/* Highlighted Vehicle Details */}
            <div className="mt-4 space-y-4 font-mono">
              <div className={`p-4 rounded-2xl border text-center ${
                isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Recognized Plate</div>
                <div className="text-2xl font-bold text-amber-500 tracking-widest mt-1">
                  {activePlate}
                </div>
                <div className="text-[11px] text-emerald-500 font-semibold mt-1">
                  Confidence Score: {liveVideoDetection?.confidence || selectedDetection?.confidence || 98.4}%
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className={`flex items-center justify-between py-1.5 border-b ${dividerBorder}`}>
                  <span className={`font-sans ${textMuted}`}>Vehicle Type:</span>
                  <span className={`font-bold font-sans ${textTitle}`}>
                    {liveVideoDetection?.vehicleType || selectedDetection?.vehicleType || 'Car'}
                  </span>
                </div>
                <div className={`flex items-center justify-between py-1.5 border-b ${dividerBorder}`}>
                  <span className={`font-sans ${textMuted}`}>Vehicle Color:</span>
                  <span className={`font-bold font-sans ${textTitle}`}>
                    {liveVideoDetection?.vehicleColor || selectedDetection?.vehicleColor || 'White'}
                  </span>
                </div>
                <div className={`flex items-center justify-between py-1.5 border-b ${dividerBorder}`}>
                  <span className={textMuted}>Lane Detected:</span>
                  <span className={`font-bold ${textTitle}`}>
                    Lane {liveVideoDetection?.laneNumber || selectedDetection?.laneNumber || 2}
                  </span>
                </div>
                <div className={`flex items-center justify-between py-1.5 border-b ${dividerBorder}`}>
                  <span className={textMuted}>Recorded Speed:</span>
                  <span className={`font-bold ${(liveVideoDetection?.speed || selectedDetection?.speed || 42.1) > 80 ? 'text-rose-400 font-extrabold' : textTitle}`}>
                    {liveVideoDetection?.speed || selectedDetection?.speed || 42.1} km/h
                    {(liveVideoDetection?.speed || selectedDetection?.speed || 42.1) > 80 && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/40">
                        OVERSPEED &gt; 80
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className={textMuted}>Optical Re-ID Match:</span>
                  <span className="font-bold text-emerald-500">{selectedDetection?.reIdScore || 96.2}%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('tracking', { plate: activePlate })}
                className={`w-full py-2.5 rounded-xl text-xs font-sans font-bold transition-all flex items-center justify-center gap-1.5 shadow border ${
                  isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>Reconstruct Full Trajectory</span>
              </button>
            </div>
          </div>

          {/* Violations on this camera */}
          <div className={`${cardBg} border rounded-2xl p-5`}>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Camera Violations</h3>
              </div>
              <span className="text-xs font-mono text-red-500 font-bold">{violations.length} Logged</span>
            </div>

            <div className={`mt-3 divide-y max-h-56 overflow-y-auto font-mono text-xs ${dividerBorder}`}>
              {violations.length === 0 ? (
                <div className={`py-4 text-center text-xs font-sans ${textMuted}`}>No active violations logged for this node.</div>
              ) : (
                violations.map(viol => (
                  <div key={viol.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className={`font-bold ${textTitle}`}>{viol.plate}</div>
                      <div className="text-[11px] text-amber-500 font-sans">{viol.violationType}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onInspectViolation(viol)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-medium transition-colors border ${
                        isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                    >
                      Investigate
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detection History Log */}
      <div className={`${cardBg} border rounded-2xl p-5`}>
        <div className={`flex items-center justify-between pb-4 border-b ${dividerBorder}`}>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Optical Detection Sighting Log</h3>
            <p className={`text-xs font-sans mt-0.5 ${textMuted}`}>Sequential optical plate captures from this camera sensor</p>
          </div>
          <span className={`text-xs font-mono ${textMuted}`}>Total Sightings: {detections.length}</span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b uppercase text-[11px] ${dividerBorder} ${textMuted}`}>
                <th className="pb-3 px-3">Time</th>
                <th className="pb-3 px-3">Plate</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Direction</th>
                <th className="pb-3 px-3">Speed</th>
                <th className="pb-3 px-3">Confidence</th>
                <th className="pb-3 px-3">Violation</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dividerBorder}`}>
              {detections.map(det => {
                const timeStr = new Date(det.timestamp).toLocaleTimeString('en-US', { hour12: false });
                const isSelected = selectedDetection?.id === det.id;

                return (
                  <tr 
                    key={det.id} 
                    onClick={() => setSelectedDetection(det)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? isDark ? 'bg-neutral-900 border-l-2 border-emerald-400' : 'bg-slate-100 border-l-2 border-slate-900' 
                        : isDark ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className={`py-3 px-3 ${textMuted}`}>{timeStr}</td>
                    <td className="py-3 px-3 font-bold">
                      <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-lg border border-amber-500/30">
                        {det.plate}
                      </span>
                    </td>
                    <td className={`py-3 px-3 font-sans ${textTitle}`}>{det.vehicleType} ({det.vehicleColor})</td>
                    <td className={`py-3 px-3 font-sans ${textMuted}`}>{det.direction}</td>
                    <td className={`py-3 px-3 ${textTitle}`}>{det.speed} km/h</td>
                    <td className="py-3 px-3 text-emerald-500 font-bold">{det.confidence}%</td>
                    <td className="py-3 px-3">
                      {det.violationId ? (
                        <span className="px-2 py-0.5 bg-red-500/15 text-red-500 border border-red-500/30 rounded-lg text-[10px] font-bold">
                          VIOLATION
                        </span>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('tracking', { plate: det.plate });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-sans font-semibold transition-colors border ${
                          isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                        }`}
                      >
                        Track Vehicle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
