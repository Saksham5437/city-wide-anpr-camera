import React, { useState } from 'react';
import { BarChart3, TrendingUp, Gauge, Car, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight, Activity, Zap } from 'lucide-react';
import { INTERSECTION_STATS } from '../../data/bengaluruData';
import { trafficStore } from '../../services/trafficStore';

interface SilkBoardMetric {
  hour: string;
  timeRange: string;
  count: number;
  transitDelayMin: number;
  avgSpeed: number;
  queueLength: number;
  status: 'Normal' | 'Moderate' | 'Heavy' | 'Critical';
}

export const TrafficAnalytics: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days'>('Today');
  const [hoveredHour, setHoveredHour] = useState<SilkBoardMetric | null>(null);

  const isDark = trafficStore.getTheme() === 'dark';
  const silkBoard = INTERSECTION_STATS[0];

  // Silk Board 06:00–11:00 Full Telemetry Dataset
  const silkBoardHourlyData: SilkBoardMetric[] = [
    { hour: '06:00', timeRange: '06:00 - 07:00 (Early Morning)', count: 1800, transitDelayMin: 4.2, avgSpeed: 38, queueLength: 80, status: 'Normal' },
    { hour: '07:00', timeRange: '07:00 - 08:00 (Morning Build-Up)', count: 3200, transitDelayMin: 9.8, avgSpeed: 28, queueLength: 180, status: 'Moderate' },
    { hour: '08:00', timeRange: '08:00 - 09:00 (Rush Hour Surge)', count: 4900, transitDelayMin: 19.5, avgSpeed: 18, queueLength: 340, status: 'Heavy' },
    { hour: '09:00', timeRange: '09:00 - 10:00 (Peak Morning Bottleneck)', count: 5600, transitDelayMin: 28.4, avgSpeed: 12, queueLength: 480, status: 'Critical' },
    { hour: '10:00', timeRange: '10:00 - 11:00 (Heavy Sustained Queue)', count: 5220, transitDelayMin: 24.1, avgSpeed: 14, queueLength: 410, status: 'Critical' },
    { hour: '11:00', timeRange: '11:00 - 12:00 (Late Morning Recovery)', count: 4800, transitDelayMin: 18.0, avgSpeed: 16, queueLength: 320, status: 'Heavy' },
  ];

  const maxVolumeScale = 6000;
  const maxDelayScale = 30; // 30 mins
  const activeMetric = hoveredHour || silkBoardHourlyData[3]; // Default to 09:00 peak

  const zoneSpeeds = [
    { zone: 'North Zone (Hebbal / Airport)', speed: 46, status: 'Normal', color: 'bg-emerald-500' },
    { zone: 'Tech Corridor (ORR / E-City)', speed: 38, status: 'Moderate', color: 'bg-neutral-500' },
    { zone: 'East Zone (Indiranagar / KR Puram)', speed: 32, status: 'Moderate', color: 'bg-neutral-500' },
    { zone: 'West Zone (Yeshwanthpur / Peenya)', speed: 29, status: 'Heavy', color: 'bg-amber-500' },
    { zone: 'Central Zone (MG Rd / CBD)', speed: 22, status: 'Heavy', color: 'bg-orange-500' },
    { zone: 'South Zone (Silk Board / Koramangala)', speed: 18, status: 'Critical', color: 'bg-red-500' }
  ];

  const vehicleDistribution = [
    { type: 'Passenger Cars / SUVs', count: 9581, pct: 52, color: 'bg-neutral-600' },
    { type: 'Two-Wheelers / Motorcycles', count: 5712, pct: 31, color: 'bg-emerald-500' },
    { type: 'Auto-Rickshaws (Three-Wheelers)', count: 1658, pct: 9, color: 'bg-amber-500' },
    { type: 'Public / Private Buses', count: 921, pct: 5, color: 'bg-purple-500' },
    { type: 'Commercial Goods Trucks', count: 554, pct: 3, color: 'bg-red-500' }
  ];

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Time Filter */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
            Urban Traffic & Intersection Analytics
          </h2>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Macro-level traffic intelligence aggregated from 50+ optical ANPR sensors across Bengaluru metropolitan area.
          </p>
        </div>

        {/* Time Filter Tabs */}
        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border font-mono text-xs ${cardBg}`}>
          {(['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setTimeFilter(tab)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                timeFilter === tab 
                  ? isDark ? 'bg-neutral-800 text-white font-bold' : 'bg-slate-900 text-white font-bold' 
                  : isDark ? 'text-neutral-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: 4 Key Macro Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardBg} border p-4 rounded-2xl font-mono`}>
          <div className={`text-xs uppercase font-semibold ${textMuted}`}>Total Optical Detections</div>
          <div className={`text-2xl font-bold mt-1 ${textTitle}`}>18,426 <span className={`text-xs font-normal font-sans ${textMuted}`}>today</span></div>
          <div className="text-[11px] text-emerald-500 mt-1 flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% vs yesterday</span>
          </div>
        </div>

        <div className={`${cardBg} border p-4 rounded-2xl font-mono`}>
          <div className={`text-xs uppercase font-semibold ${textMuted}`}>City-Wide Avg Speed</div>
          <div className="text-2xl font-bold text-amber-500 mt-1">31.4 <span className={`text-xs font-normal font-sans ${textMuted}`}>km/h</span></div>
          <div className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>-2.1 km/h during peak</span>
          </div>
        </div>

        <div className={`${cardBg} border p-4 rounded-2xl font-mono`}>
          <div className={`text-xs uppercase font-semibold ${textMuted}`}>Congestion Index</div>
          <div className="text-2xl font-bold text-orange-500 mt-1">68.2% <span className={`text-xs font-normal font-sans ${textMuted}`}>Dense</span></div>
          <div className={`text-[11px] mt-1 ${textMuted}`}>Peak: 09:15 AM</div>
        </div>

        <div className={`${cardBg} border p-4 rounded-2xl font-mono`}>
          <div className={`text-xs uppercase font-semibold ${textMuted}`}>Enforcement Accuracy</div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">99.1%</div>
          <div className="text-[11px] text-emerald-500 mt-1 font-semibold">Optical Re-ID Validated</div>
        </div>
      </div>

      {/* Row 2: Deep Dive on Silk Board Junction with Professional 06:00-11:00 Chart */}
      <div className={`border-2 border-red-500/40 rounded-2xl p-5 shadow-2xl ${cardBg}`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-2 ${dividerBorder}`}>
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`text-sm font-bold uppercase tracking-wider font-mono ${textTitle}`}>
                Featured Critical Bottleneck: Silk Board Junction
              </span>
              <span className="px-2.5 py-0.5 bg-red-600 text-white text-[10px] font-mono font-bold rounded-full animate-pulse shadow">
                CRITICAL CONGESTION
              </span>
            </div>
            <p className={`text-xs mt-1 font-sans ${textMuted}`}>
              Intersection of Outer Ring Road (ORR) and Hosur Road — Primary South Corridor Interchange
            </p>
          </div>

          <div className={`text-xs font-mono ${textTitle}`}>
            Node ID: <b className="text-emerald-500">INT-BLR-001</b>
          </div>
        </div>

        {/* 4 Silk Board KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className={`p-3.5 rounded-xl border font-mono text-center ${
            isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Throughput</div>
            <div className="text-xl font-bold text-red-500 mt-0.5">{silkBoard.vehiclesPerMin} <span className="text-xs font-sans">veh/min</span></div>
          </div>
          <div className={`p-3.5 rounded-xl border font-mono text-center ${
            isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Transit Speed</div>
            <div className="text-xl font-bold text-red-500 mt-0.5">{silkBoard.avgSpeedKmh} <span className="text-xs font-sans">km/h</span></div>
          </div>
          <div className={`p-3.5 rounded-xl border font-mono text-center ${
            isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Queue Tail Length</div>
            <div className="text-xl font-bold text-amber-500 mt-0.5">{silkBoard.queueLengthMeters} <span className="text-xs font-sans">meters</span></div>
          </div>
          <div className={`p-3.5 rounded-xl border font-mono text-center ${
            isDark ? 'bg-black border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`text-[10px] uppercase font-semibold ${textMuted}`}>Violations Today</div>
            <div className={`text-xl font-bold mt-0.5 ${textTitle}`}>{silkBoard.violationsToday} <span className={`text-xs font-sans ${textMuted}`}>logged</span></div>
          </div>
        </div>

        {/* Silk Board Hourly Volume & Transit Delay (06:00 - 11:00) */}
        <div className={`mt-5 pt-4 border-t ${dividerBorder}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-2 ${textTitle}`}>
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span>Silk Board Hourly Volume & Transit Delay (06:00 – 11:00)</span>
              </h4>
              <p className={`text-[11px] font-sans ${textMuted}`}>
                Dual-axis analytics correlating peak hourly vehicle volume with commuter delay times.
              </p>
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-red-600 shadow-xs" />
                <span className={textMuted}>Volume (veh/hr)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                <span className="text-amber-500 font-bold">━ Transit Delay (mins)</span>
              </div>
            </div>
          </div>

          {/* Interactive Hover HUD */}
          <div className={`p-2.5 rounded-xl border mb-3 flex flex-wrap items-center justify-between text-xs font-mono ${
            isDark ? 'bg-black/70 border-neutral-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className={textMuted}>Window:</span>
              <span className={`font-bold ${textTitle}`}>{activeMetric.timeRange}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                activeMetric.status === 'Normal' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                activeMetric.status === 'Moderate' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                'bg-red-600/20 text-red-500 border-red-500/40'
              }`}>
                {activeMetric.status === 'Critical' ? '★ PEAK SURGE' : activeMetric.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span>Throughput: <b className="text-red-500 font-bold">{activeMetric.count.toLocaleString()}</b> veh/hr</span>
              <span className="text-neutral-500">|</span>
              <span>Delay: <b className="text-amber-500 font-bold">+{activeMetric.transitDelayMin} mins</b></span>
              <span className="text-neutral-500">|</span>
              <span>Speed: <b className={textTitle}>{activeMetric.avgSpeed} km/h</b></span>
              <span className="text-neutral-500">|</span>
              <span>Queue: <b className={textTitle}>{activeMetric.queueLength}m</b></span>
            </div>
          </div>

          {/* Dual-Axis Visual Chart Container */}
          <div className="relative pt-6 pb-2">
            {/* Left & Right Y-Axis Background Grid */}
            <div className="flex h-56 w-full relative">
              {/* Left Y-Axis (Volume) */}
              <div className={`w-12 h-full flex flex-col justify-between text-right pr-2 text-[10px] font-mono select-none ${textMuted}`}>
                <span>6.0k</span>
                <span>4.5k</span>
                <span>3.0k</span>
                <span>1.5k</span>
                <span>0</span>
              </div>

              {/* Center Chart Body */}
              <div className="flex-1 h-full relative flex items-end justify-between gap-3 sm:gap-6 px-4">
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b border-dashed ${isDark ? 'border-neutral-600' : 'border-slate-400'}`} />
                  <div className={`border-b ${isDark ? 'border-neutral-700' : 'border-slate-300'}`} />
                </div>

                {/* SVG Connecting Transit Delay Trendline */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={silkBoardHourlyData.map((d, i) => {
                      const totalSlots = silkBoardHourlyData.length;
                      const xPercent = ((i + 0.5) / totalSlots) * 100;
                      // 0 delay is bottom (100%), 30 min delay is top (10%)
                      const yPercent = 100 - (d.transitDelayMin / maxDelayScale) * 85 - 5;
                      return `${xPercent}%,${yPercent}%`;
                    }).join(' ')}
                  />
                </svg>

                {/* Bars for 06:00 to 11:00 */}
                {silkBoardHourlyData.map((item, idx) => {
                  const heightPct = Math.round((item.count / maxVolumeScale) * 100);
                  const delayPct = Math.round((item.transitDelayMin / maxDelayScale) * 100);
                  const isHovered = hoveredHour?.hour === item.hour;

                  const barBg = 
                    item.count >= 5200 ? 'bg-red-600 hover:bg-red-500 shadow-md shadow-red-600/30' :
                    item.count >= 4000 ? 'bg-orange-500 hover:bg-orange-400 shadow-sm shadow-orange-500/20' :
                    item.count >= 3000 ? 'bg-amber-500 hover:bg-amber-400' :
                    'bg-emerald-500 hover:bg-emerald-400';

                  return (
                    <div 
                      key={item.hour}
                      onMouseEnter={() => setHoveredHour(item)}
                      onMouseLeave={() => setHoveredHour(null)}
                      className="h-full flex-1 flex flex-col justify-end items-center relative group cursor-pointer z-10"
                    >
                      {/* Transit Delay Floating Dot on Trendline */}
                      <div 
                        className="absolute z-30 flex flex-col items-center pointer-events-none transition-all duration-200"
                        style={{ bottom: `${Math.min(92, Math.max(8, delayPct * 0.85 + 5))}%` }}
                      >
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500 text-black shadow-md -mb-1">
                          +{item.transitDelayMin}m
                        </span>
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white shadow-md" />
                      </div>

                      {/* Top Bar Volume Tooltip */}
                      <div className={`text-[10px] font-mono font-bold mb-1 transition-opacity ${
                        isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      } ${textTitle}`}>
                        {item.count.toLocaleString()}
                      </div>

                      {/* Main Volume Bar */}
                      <div 
                        className={`w-full max-w-[54px] rounded-t-lg transition-all duration-300 ${barBg} ${
                          isHovered ? 'brightness-125 scale-y-105 origin-bottom' : ''
                        }`}
                        style={{ height: `${Math.max(12, heightPct)}%` }}
                      />

                      {/* X-Axis Time Label */}
                      <span className={`text-[11px] font-mono mt-2 font-bold select-none transition-colors ${
                        item.status === 'Critical' ? 'text-red-500' : textTitle
                      }`}>
                        {item.hour}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Right Y-Axis (Delay) */}
              <div className={`w-12 h-full flex flex-col justify-between text-left pl-2 text-[10px] font-mono select-none text-amber-500 font-bold`}>
                <span>30m</span>
                <span>22m</span>
                <span>15m</span>
                <span>7m</span>
                <span>0m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Average Speed by Zone & Vehicle Class Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speed Compliance by Zone */}
        <div className={`${cardBg} border rounded-2xl p-5`}>
          <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Average Speed by City Zone</h3>
            <span className={`text-[10px] font-mono font-semibold ${textMuted}`}>Target: 40 km/h</span>
          </div>

          <div className="mt-4 space-y-3.5">
            {zoneSpeeds.map(z => (
              <div key={z.zone} className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className={`font-sans ${textTitle}`}>{z.zone}</span>
                  <span className={`font-bold ${textTitle}`}>{z.speed} km/h</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                  <div 
                    className={`h-full rounded-full ${z.color}`}
                    style={{ width: `${(z.speed / 60) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Classification Distribution */}
        <div className={`${cardBg} border rounded-2xl p-5`}>
          <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${textTitle}`}>Vehicle Class Distribution</h3>
            <span className={`text-[10px] font-mono font-semibold ${textMuted}`}>AI Neural Classifier</span>
          </div>

          <div className="mt-4 space-y-3.5 font-mono text-xs">
            {vehicleDistribution.map(vd => (
              <div key={vd.type} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-sans ${textTitle}`}>{vd.type}</span>
                  <span className={textMuted}>
                    <b className={`font-mono ${textTitle}`}>{vd.count.toLocaleString()}</b> ({vd.pct}%)
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-neutral-800' : 'bg-slate-100'}`}>
                  <div 
                    className={`h-full rounded-full ${vd.color}`}
                    style={{ width: `${vd.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
