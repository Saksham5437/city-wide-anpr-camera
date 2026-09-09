import React, { useState } from 'react';
import { 
  Camera, 
  Car, 
  ShieldAlert, 
  Route, 
  Bell, 
  TrendingUp, 
  Clock, 
  Gauge, 
  ArrowUpRight,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Activity,
  Radio,
  Sun,
  Moon
} from 'lucide-react';
import { Camera as CameraType, Violation, Alert, DashboardStats, IntersectionStats } from '../../types';
import { INTERSECTION_STATS } from '../../data/bengaluruData';
import { NavTab } from '../layout/Sidebar';
import { trafficStore } from '../../services/trafficStore';

interface DashboardProps {
  stats: DashboardStats;
  cameras: CameraType[];
  violations: Violation[];
  alerts: Alert[];
  onNavigate: (tab: NavTab, meta?: any) => void;
  onInspectViolation: (violation: Violation) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  cameras,
  violations,
  alerts,
  onNavigate,
  onInspectViolation,
  theme,
  onToggleTheme
}) => {
  const isDark = theme === 'dark';

  // Violation summary category counts
  const violationCounts: Record<string, number> = {
    'Speeding': violations.filter(v => v.violationType === 'Speeding').length,
    'Red Light': violations.filter(v => v.violationType === 'Red Light').length,
    'Wrong Way': violations.filter(v => v.violationType === 'Wrong Way').length,
    'Illegal Parking': violations.filter(v => v.violationType === 'Illegal Parking').length,
    'No Helmet': violations.filter(v => v.violationType === 'No Helmet').length,
    'No Seatbelt': violations.filter(v => v.violationType === 'No Seatbelt').length,
    'Lane Violation': violations.filter(v => v.violationType === 'Lane Violation').length,
    'Stop Line': violations.filter(v => v.violationType === 'Stop Line Violation').length
  };

  const topRecentViolations = violations.slice(0, 7);
  const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').slice(0, 5);

  const [selectedChartCamera, setSelectedChartCamera] = useState<string>('ALL');
  const [hoveredHour, setHoveredHour] = useState<any | null>(null);

  // Dynamic 24-Hour Traffic Data from Store
  const hourlyData = trafficStore.getHourlyTrafficData(selectedChartCamera);
  const maxVolume = Math.max(...hourlyData.map(d => d.volume), 1);
  const currentHourData = hourlyData.find(d => d.isCurrentHour) || hourlyData[hourlyData.length - 1];
  const peakHourData = hourlyData.find(d => d.isPeak) || hourlyData[0];
  const total24hVolume = hourlyData.reduce((acc, d) => acc + d.volume, 0);

  // Surface and border tokens
  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const innerBg = isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const textSubtle = isDark ? 'text-neutral-500' : 'text-slate-400';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-100';

  return (
    <div className={`p-5 sm:p-6 space-y-6 max-w-7xl mx-auto transition-colors ${
      isDark ? 'text-white' : 'text-slate-900'
    }`}>
      {/* Top Welcome & Mission Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={`text-xl font-bold tracking-tight font-sans ${textTitle}`}>
              Traffic Intelligence Command Hub
            </h2>
            <span className={`px-2.5 py-0.5 text-[11px] font-mono rounded-full font-semibold border ${
              isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              SYSTEM OPERATIONAL
            </span>
          </div>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            City-wide automated traffic surveillance, multi-camera ANPR trajectory tracking, and automated violation enforcement.
          </p>
        </div>

        {/* Action Controls & Quick Links */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium border flex items-center gap-1.5 transition-all ${
              isDark 
                ? 'bg-neutral-900 border-neutral-700 text-amber-400 hover:bg-neutral-800' 
                : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? 'LIGHT MODE' : 'DARK MODE'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tracking', { plate: 'KA01AB1234' })}
            className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-xl text-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span>KA01AB1234</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <span>City GIS Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Active Cameras */}
        <div 
          onClick={() => onNavigate('cameras')}
          className={`${cardBg} border p-4.5 rounded-2xl cursor-pointer transition-all duration-150 hover:border-neutral-700 hover:scale-[1.01] group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider font-mono ${textSubtle}`}>Active Cameras</span>
            <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-900 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${textTitle}`}>
            {stats.activeCameras} <span className={`text-xs font-sans font-normal ${textSubtle}`}>/ {stats.totalCameras}</span>
          </div>
          <div className="text-[11px] text-emerald-500 font-mono mt-1.5 flex items-center gap-1.5 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>98.6% Operational</span>
          </div>
        </div>

        {/* Vehicles Detected Today */}
        <div 
          onClick={() => onNavigate('search')}
          className={`${cardBg} border p-4.5 rounded-2xl cursor-pointer transition-all duration-150 hover:border-neutral-700 hover:scale-[1.01] group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider font-mono ${textSubtle}`}>Detections</span>
            <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-slate-100 text-slate-700'}`}>
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${textTitle}`}>
            {stats.vehiclesDetectedToday.toLocaleString()}
          </div>
          <div className={`text-[11px] font-mono mt-1.5 font-semibold ${isDark ? 'text-neutral-300' : 'text-slate-600'}`}>
            +340 last 10 mins
          </div>
        </div>

        {/* Violations Today */}
        <div 
          onClick={() => onNavigate('violations')}
          className={`${cardBg} border p-4.5 rounded-2xl cursor-pointer transition-all duration-150 hover:border-neutral-700 hover:scale-[1.01] group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider font-mono ${textSubtle}`}>Violations</span>
            <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-900 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500 tracking-tight">
            {stats.violationsToday}
          </div>
          <div className="text-[11px] text-amber-500 font-mono mt-1.5 font-semibold">
            ₹{((stats.violationsToday * 1100) / 100000).toFixed(1)}L Total Demand
          </div>
        </div>

        {/* Vehicles Currently Tracked */}
        <div 
          onClick={() => onNavigate('tracking')}
          className={`${cardBg} border p-4.5 rounded-2xl cursor-pointer transition-all duration-150 hover:border-neutral-700 hover:scale-[1.01] group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider font-mono ${textSubtle}`}>Tracked Targets</span>
            <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-900 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Route className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono tracking-tight ${textTitle}`}>
            {stats.vehiclesTracked}
          </div>
          <div className="text-[11px] text-emerald-500 font-mono mt-1.5 font-semibold">
            Active Multi-Cam Re-ID
          </div>
        </div>

        {/* Active Alerts */}
        <div 
          onClick={() => onNavigate('alerts')}
          className={`${cardBg} border p-4.5 rounded-2xl cursor-pointer transition-all duration-150 hover:border-neutral-700 hover:scale-[1.01] group relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider font-mono ${textSubtle}`}>Active Alerts</span>
            <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-900 text-red-400' : 'bg-red-50 text-red-600'}`}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-red-500 tracking-tight">
            {stats.activeAlerts}
          </div>
          <div className="text-[11px] text-red-500 font-mono mt-1.5 font-semibold">
            2 Watchlist Matches
          </div>
        </div>
      </div>

      {/* Row 2: Corridor Congestion & 24-Hour Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Corridor Congestion */}
        <div className={`${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${textTitle}`}>
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Corridor Congestion</span>
              </h3>
              <span className={`text-[10px] font-mono ${textSubtle}`}>Real-Time</span>
            </div>

            <div className={`divide-y mt-2 ${dividerBorder}`}>
              {INTERSECTION_STATS.map(node => {
                const badgeColor = 
                  node.trafficLevel === 'Critical' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                  node.trafficLevel === 'Heavy' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                  node.trafficLevel === 'Moderate' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

                return (
                  <div key={node.id} className={`py-2.5 flex items-center justify-between px-2 rounded-xl transition-colors ${
                    isDark ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                  }`}>
                    <div>
                      <div className={`text-xs font-bold font-sans ${textTitle}`}>{node.name}</div>
                      <div className={`text-[10px] font-mono mt-0.5 ${textMuted}`}>
                        {node.vehiclesPerMin} v/m • Avg {node.avgSpeedKmh} km/h • Q: {node.queueLengthMeters}m
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${badgeColor}`}>
                      {node.trafficLevel.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('analytics')}
            className={`w-full mt-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
          >
            <span>View Full Intersection Analytics</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        </div>

        {/* 24-Hour Traffic Trend & Volume */}
        <div className={`lg:col-span-2 ${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            {/* Header & Camera Selector */}
            <div className={`flex flex-col md:flex-row md:items-center justify-between pb-3 border-b gap-3 ${dividerBorder}`}>
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>
                    Traffic Volume — 24-Hour Continuum (12 AM – 12 AM)
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className={`text-xs font-sans mt-0.5 ${textMuted}`}>
                  Live optical movement tracking across 24 hourly buckets updated in real time.
                </p>
              </div>

              {/* Camera Filter Selector & Live Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedChartCamera}
                    onChange={(e) => setSelectedChartCamera(e.target.value)}
                    className={`rounded-xl px-3 py-1 text-xs font-mono font-bold focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="ALL">All 50+ Cameras (City-Wide Flow)</option>
                    {cameras.slice(0, 20).map(cam => (
                      <option key={cam.code} value={cam.code}>
                        {cam.code}: {cam.name} ({cam.zone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`px-2.5 py-1 rounded-xl border ${innerBg}`}>
                  <span className={textMuted}>Current: </span>
                  <span className="text-emerald-400 font-bold">{currentHourData?.volume.toLocaleString()} veh</span>
                </div>
                <div className={`px-2.5 py-1 rounded-xl border ${innerBg}`}>
                  <span className={textMuted}>Peak: </span>
                  <span className="text-red-400 font-bold">{peakHourData?.hourLabel} ({peakHourData?.volume.toLocaleString()})</span>
                </div>
              </div>
            </div>

            {/* Interactive Sighting Telemetry HUD & Color Legend */}
            <div className={`mt-3 px-3 py-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
              isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {/* Selected Interval Telemetry */}
              {(() => {
                const activeItem = hoveredHour || currentHourData;
                const ratio = activeItem ? activeItem.volume / maxVolume : 0;
                const densityTier = 
                  ratio < 0.40 ? { label: 'LOW TRAFFIC', badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' } :
                  ratio <= 0.75 ? { label: 'MODERATE FLOW', badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' } :
                  { label: 'VERY HIGH CONGESTION', badgeBg: 'bg-red-500/15 text-red-400 border-red-500/30' };

                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={textMuted}>Interval:</span>
                    <span className={`font-bold ${textTitle}`}>
                      {activeItem?.timeRange} ({activeItem?.hourLabel})
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${densityTier.badgeBg}`}>
                      ● {densityTier.label}
                    </span>
                    {activeItem?.isCurrentHour && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
                        LIVE NOW
                      </span>
                    )}
                    <span className="ml-2">Volume: <b className={`font-bold ${
                      ratio < 0.40 ? 'text-emerald-400' : ratio <= 0.75 ? 'text-amber-400' : 'text-red-400'
                    }`}>{activeItem?.volume.toLocaleString()}</b> veh</span>
                    <span className="text-neutral-500">|</span>
                    <span>Avg Speed: <b className={textTitle}>{activeItem?.avgSpeed} km/h</b></span>
                  </div>
                );
              })()}

              {/* Color Legend */}
              <div className="flex items-center gap-3 text-[11px] self-end sm:self-center font-sans">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                  <span>Low (&lt;40%)</span>
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                  <span>Moderate (40-75%)</span>
                </span>
                <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-xs" />
                  <span>Very High (&gt;75%)</span>
                </span>
              </div>
            </div>

            {/* 24-Hour Continuous Bar Chart */}
            <div className="mt-4 pt-1">
              <div className="h-44 w-full relative flex items-end justify-between gap-1 sm:gap-1.5 px-1 pb-1">
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b ${isDark ? 'border-neutral-700' : 'border-slate-300'}`} />
                </div>

                {/* 24 Hourly Volume Bars */}
                {hourlyData.map(item => {
                  const heightPercent = Math.round((item.volume / maxVolume) * 100);
                  const ratio = item.volume / maxVolume;
                  const isHovered = hoveredHour?.hourIndex === item.hourIndex;

                  const barColor = 
                    ratio < 0.40 
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-xs' :
                    ratio <= 0.75 
                      ? 'bg-amber-500 hover:bg-amber-400 shadow-xs' :
                      'bg-red-600 hover:bg-red-500 shadow-xs';

                  const labelColor = 
                    item.isCurrentHour ? 'text-white font-extrabold bg-emerald-600 px-1 rounded-sm' :
                    ratio < 0.40 ? 'text-emerald-400 font-semibold' :
                    ratio <= 0.75 ? 'text-amber-400 font-semibold' :
                    'text-red-400 font-bold';

                  return (
                    <div 
                      key={item.hourIndex} 
                      onMouseEnter={() => setHoveredHour(item)}
                      onMouseLeave={() => setHoveredHour(null)}
                      className="h-full flex-1 flex flex-col justify-end items-center relative group cursor-pointer z-10"
                    >
                      {item.isCurrentHour && (
                        <div className="absolute -top-3.5 flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 -mt-1.5" />
                        </div>
                      )}

                      <div 
                        className={`w-full rounded-t transition-all duration-150 ${barColor} ${
                          isHovered ? 'brightness-125 scale-y-105 origin-bottom' : ''
                        }`}
                        style={{ height: `${Math.max(6, heightPercent)}%` }}
                      />

                      <span className={`text-[9px] font-mono mt-1 select-none transition-colors ${labelColor}`}>
                        {item.hourIndex % 2 === 0 ? item.hourLabel.replace(' ', '') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sub-KPI bar */}
          <div className={`mt-4 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono ${dividerBorder}`}>
            <div className={`p-2.5 rounded-xl border ${innerBg}`}>
              <div className={`text-[10px] ${textSubtle}`}>24H TOTAL VOLUME</div>
              <div className={`text-sm font-bold mt-0.5 ${textTitle}`}>{total24hVolume.toLocaleString()} veh</div>
            </div>
            <div className={`p-2.5 rounded-xl border ${innerBg}`}>
              <div className={`text-[10px] ${textSubtle}`}>PEAK TIME WINDOW</div>
              <div className="text-sm font-bold text-amber-500 mt-0.5">{peakHourData?.timeRange}</div>
            </div>
            <div className={`p-2.5 rounded-xl border ${innerBg}`}>
              <div className={`text-[10px] ${textSubtle}`}>AVG SPEED TRANSIT</div>
              <div className={`text-sm font-bold mt-0.5 ${textTitle}`}>{stats.averageCitySpeed} km/h</div>
            </div>
            <div className={`p-2.5 rounded-xl border ${innerBg}`}>
              <div className={`text-[10px] ${textSubtle}`}>SENSOR HEALTH</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">100% Online</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Violation Summary Breakdown + Live Alerts + Recent Violations Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Violation Distribution */}
        <div className={`${cardBg} border rounded-2xl p-5`}>
          <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Violation Breakdown</h3>
            <span className={`text-[10px] font-mono ${textMuted}`}>Total: {stats.violationsToday}</span>
          </div>

          <div className="mt-4 space-y-3">
            {Object.entries(violationCounts).map(([cat, count]) => {
              const pct = Math.round((count / (stats.violationsToday || 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className={`font-sans ${textTitle}`}>{cat}</span>
                    <span className={`font-mono ${textMuted}`}>{count} ({pct}%)</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-neutral-900' : 'bg-slate-100'}`}>
                    <div 
                      className={`h-full rounded-full ${
                        cat === 'Speeding' ? 'bg-red-500' :
                        cat === 'Red Light' ? 'bg-orange-500' :
                        cat === 'Wrong Way' ? 'bg-amber-500' : 'bg-neutral-500'
                      }`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('violations')}
            className={`w-full mt-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
          >
            <span>Open Violations Docket</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        </div>

        {/* Live Alerts Stream */}
        <div className={`${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Live System Alerts</h3>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <button 
                onClick={() => onNavigate('alerts')}
                className="text-xs text-emerald-400 hover:underline font-mono font-bold"
              >
                View All
              </button>
            </div>

            <div className={`divide-y mt-2 space-y-1 ${dividerBorder}`}>
              {activeAlerts.map(alt => (
                <div key={alt.id} className={`py-2.5 px-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`font-bold ${
                      alt.type === 'Critical' ? 'text-red-400' :
                      alt.type === 'Warning' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      ● {alt.type.toUpperCase()}
                    </span>
                    <span className={`text-[10px] ${textSubtle}`}>{alt.timestamp}</span>
                  </div>
                  <div className={`text-xs font-bold mt-1 font-sans ${textTitle}`}>{alt.title}</div>
                  <div className={`text-[11px] mt-0.5 truncate font-sans ${textMuted}`}>{alt.description}</div>
                  {alt.vehiclePlate && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate('tracking', { plate: alt.vehiclePlate })}
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors border ${
                          isDark 
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-200 hover:bg-neutral-800' 
                            : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        Track {alt.vehiclePlate}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Camera Quick Preview Mini Grid */}
        <div className={`${cardBg} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Priority CCTV Nodes</h3>
              <button 
                onClick={() => onNavigate('cameras')}
                className="text-xs text-emerald-400 hover:underline font-mono font-bold"
              >
                All 50+ Feeds
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {cameras.slice(0, 3).map(cam => (
                <div 
                  key={cam.id}
                  onClick={() => onNavigate('cameras', { selectedCamera: cam })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isDark 
                      ? 'bg-black border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/60' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className={`font-bold ${textTitle}`}>{cam.code}</span>
                    <span className="text-emerald-400 font-bold">● {cam.status}</span>
                  </div>
                  <div className={`text-xs font-semibold truncate mt-0.5 font-sans ${textTitle}`}>{cam.name}</div>
                  <div className={`flex items-center justify-between text-[10px] font-mono mt-1 ${textMuted}`}>
                    <span>Vol: {cam.vehiclesPerMin} v/m</span>
                    <span className="text-amber-400 font-bold">{cam.lastDetectedPlate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('cameras')}
            className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all shadow border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
            }`}
          >
            Launch Multi-Camera Grid
          </button>
        </div>
      </div>

      {/* Row 4: Recent Violations Table */}
      <div className={`${cardBg} border rounded-2xl p-5`}>
        <div className={`flex items-center justify-between pb-4 border-b ${dividerBorder}`}>
          <div>
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Recent Optical Infractions</h3>
            <p className={`text-xs font-sans mt-0.5 ${textMuted}`}>Automated optical evidence recorded by AI Edge ANPR cameras</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('violations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
            }`}
          >
            View All Violations
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b font-semibold uppercase text-[11px] ${dividerBorder} ${textSubtle}`}>
                <th className="pb-3 px-3">Time</th>
                <th className="pb-3 px-3">Vehicle</th>
                <th className="pb-3 px-3">Location</th>
                <th className="pb-3 px-3">Violation</th>
                <th className="pb-3 px-3">Camera</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dividerBorder}`}>
              {topRecentViolations.map(viol => {
                const timeStr = new Date(viol.timestamp).toLocaleTimeString('en-US', { hour12: false });
                const statusBadge = 
                  viol.status === 'Confirmed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                  viol.status === 'New' ? 'bg-neutral-500/15 text-neutral-400 border-neutral-500/30' :
                  viol.status === 'Under Review' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  viol.status === 'Rejected' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                  'bg-slate-500/15 text-slate-400 border-slate-500/30';

                return (
                  <tr key={viol.id} className={`transition-colors ${
                    isDark ? 'hover:bg-neutral-900/60' : 'hover:bg-slate-50'
                  }`}>
                    <td className={`py-3.5 px-3 ${textMuted}`}>{timeStr}</td>
                    <td className="py-3.5 px-3">
                      <button 
                        onClick={() => onNavigate('search', { query: viol.plate })}
                        className="font-bold text-amber-400 hover:underline"
                      >
                        {viol.plate}
                      </button>
                      <div className={`text-[10px] font-sans ${textSubtle}`}>{viol.vehicleType} • {viol.vehicleColor}</div>
                    </td>
                    <td className={`py-3.5 px-3 font-sans ${textTitle}`}>{viol.location}</td>
                    <td className="py-3.5 px-3">
                      <span className={`font-semibold ${textTitle}`}>{viol.violationType}</span>
                      {viol.recordedSpeed && (
                        <span className="text-[10px] text-red-400 block font-mono font-bold">{viol.recordedSpeed} km/h (Limit {viol.speedLimit})</span>
                      )}
                    </td>
                    <td className={`py-3.5 px-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{viol.cameraCode}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] border font-bold ${statusBadge}`}>
                        {viol.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectViolation(viol)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-sans font-semibold transition-colors border ${
                          isDark 
                            ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                        }`}
                      >
                        Investigate
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
