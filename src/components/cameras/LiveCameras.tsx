import React, { useState } from 'react';
import { Camera, CityZone, CameraStatus, CameraFilter } from '../../types';
import { CCTVFeedSimulator } from './CCTVFeedSimulator';
import { Search, Eye, Video, Cpu, Sliders, CheckCircle2, AlertTriangle, Activity, Upload } from 'lucide-react';
import { NavTab } from '../layout/Sidebar';
import { trafficStore } from '../../services/trafficStore';

interface LiveCamerasProps {
  cameras: Camera[];
  onSelectCamera: (camera: Camera) => void;
  onNavigate: (tab: NavTab, meta?: any) => void;
}

export const LiveCameras: React.FC<LiveCamerasProps> = ({
  cameras,
  onSelectCamera,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>('All Cameras');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  const isDark = trafficStore.getTheme() === 'dark';

  // Filter cameras
  const filteredCameras = cameras.filter(cam => {
    const matchSearch = 
      !searchQuery || 
      cam.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cam.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchZone = selectedZone === 'All' || cam.zone === selectedZone;

    let matchStatus = true;
    if (selectedFilter === 'Online') matchStatus = cam.status === 'ONLINE';
    else if (selectedFilter === 'Offline') matchStatus = cam.status === 'OFFLINE';
    else if (selectedFilter === 'Maintenance') matchStatus = cam.status === 'MAINTENANCE';

    return matchSearch && matchZone && matchStatus;
  });

  const totalPages = Math.ceil(filteredCameras.length / itemsPerPage) || 1;
  const paginatedCameras = filteredCameras.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const zones: (CityZone | 'All')[] = ['All', 'Central', 'North', 'South', 'East', 'West', 'Tech Corridor'];
  const filterOptions: CameraFilter[] = ['All Cameras', 'Online', 'Offline', 'Maintenance'];

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
              City-Wide ANPR Camera Network
            </h2>
            <span className={`px-2.5 py-0.5 text-xs font-mono rounded-full font-bold border ${
              isDark ? 'bg-neutral-900 text-emerald-400 border-neutral-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {filteredCameras.length} ANPR Nodes
            </span>
          </div>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Unified optical ANPR camera feeds executing integrated plate recognition, speed estimation, red-light detection, and traffic density analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('video-anpr')}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-sm cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Analyze Video</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('map')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 border ${
              isDark 
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-xs'
            }`}
          >
            <span>View on City Map</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`${cardBg} border rounded-2xl p-4 space-y-3`}>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Search camera code (e.g. CAM-021), location, or road..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-mono focus:outline-none border ${
                isDark 
                  ? 'bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-slate-400'
              }`}
            />
          </div>

          {/* Zone Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
            {zones.map(z => (
              <button
                key={z}
                type="button"
                onClick={() => {
                  setSelectedZone(z);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-colors border ${
                  selectedZone === z 
                    ? isDark ? 'bg-neutral-800 text-white border-neutral-600 font-bold' : 'bg-slate-900 text-white border-slate-900 font-bold'
                    : isDark ? 'bg-black text-neutral-400 hover:bg-neutral-900 border-neutral-800' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters: All Cameras / Online / Offline / Maintenance */}
        <div className={`flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t text-xs ${dividerBorder}`}>
          <div className="flex items-center gap-2 font-mono">
            <span className={`font-medium mr-1 ${textMuted}`}>Status:</span>
            {filterOptions.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setSelectedFilter(option);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-mono transition-colors border ${
                  selectedFilter === option 
                    ? isDark 
                      ? 'bg-neutral-800 text-white border-neutral-600 font-bold' 
                      : 'bg-slate-900 text-white border-slate-900 font-bold' 
                    : isDark 
                      ? 'bg-black text-neutral-400 border-neutral-800 hover:bg-neutral-900' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {option === 'Online' && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />}
                {option === 'Offline' && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />}
                {option === 'Maintenance' && <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />}
                {option}
              </button>
            ))}
          </div>

          <div className={`font-mono text-[11px] ${textMuted}`}>
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredCameras.length)} of {filteredCameras.length}
          </div>
        </div>
      </div>

      {/* Cameras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {paginatedCameras.map(cam => {
          const statusColor = 
            cam.status === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
            cam.status === 'OFFLINE' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
            'bg-amber-500/15 text-amber-500 border-amber-500/30';

          const trafficColor = 
            cam.trafficLevel === 'Critical' ? 'text-red-500' :
            cam.trafficLevel === 'Heavy' ? 'text-orange-500' :
            cam.trafficLevel === 'Moderate' ? 'text-amber-500' : 'text-emerald-500';

          return (
            <div 
              key={cam.id}
              onClick={() => onSelectCamera(cam)}
              className={`${cardBg} border rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01] group flex flex-col justify-between`}
            >
              {/* Card Header */}
              <div className={`p-3.5 border-b flex items-center justify-between ${
                isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${textTitle}`}>{cam.code}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                      ● {cam.status}
                    </span>
                  </div>
                  <div className={`text-xs font-semibold truncate max-w-[180px] mt-0.5 font-sans ${textTitle}`}>{cam.name}</div>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isDark ? 'bg-black border-neutral-800 text-neutral-400' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  {cam.zone}
                </span>
              </div>

              {/* Camera Video Feed */}
              <div className="p-2 bg-black">
                <CCTVFeedSimulator 
                  camera={cam} 
                  height="160px" 
                  interactive={true} 
                  allowVideoUpload={true} 
                />
              </div>

              {/* AI Functions Active Badges */}
              <div className={`px-3.5 py-2 border-t flex flex-wrap items-center gap-1.5 text-[10px] font-mono ${
                isDark ? 'bg-black/60 border-neutral-800' : 'bg-slate-50 border-slate-100'
              }`}>
                <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 rounded font-bold">
                  ANPR OCR
                </span>
                <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded">
                  Speed Radar
                </span>
                <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded">
                  Red Light
                </span>
                <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded">
                  Density
                </span>
              </div>

              {/* Card Telemetry Footer */}
              <div className={`p-3.5 border-t space-y-2 text-xs font-mono ${
                isDark ? 'border-neutral-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={textMuted}>Throughput:</span>
                  <span className={`font-bold ${textTitle}`}>{cam.vehiclesPerMin} veh/min</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={textMuted}>Traffic Density:</span>
                  <span className={`font-bold ${trafficColor}`}>{cam.trafficLevel}</span>
                </div>

                <div className={`flex items-center justify-between pt-1 border-t ${dividerBorder}`}>
                  <span className={textMuted}>Last Sighted:</span>
                  <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-lg font-bold border border-amber-500/30">
                    {cam.lastDetectedPlate}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className={textMuted}>Violations Today:</span>
                  <span className="text-red-500 font-bold">{cam.violationsToday}</span>
                </div>

                {/* Inspect Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCamera(cam);
                  }}
                  className={`w-full mt-2.5 py-2 rounded-xl text-xs font-sans font-semibold transition-all flex items-center justify-center gap-1.5 border ${
                    isDark 
                      ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect ANPR Stream</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between pt-4 border-t font-mono text-xs ${dividerBorder}`}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className={`px-4 py-2 disabled:opacity-30 rounded-xl border transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            ← Previous
          </button>
          <span className={textMuted}>Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className={`px-4 py-2 disabled:opacity-30 rounded-xl border transition-colors ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};
