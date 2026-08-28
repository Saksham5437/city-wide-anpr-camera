import React, { useState } from 'react';
import { Camera, CameraStatus, CityZone, CameraFilter } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  Sliders, 
  Plus, 
  Search, 
  Video, 
  Power, 
  Settings2, 
  MapPin, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface CameraManagementProps {
  cameras: Camera[];
  onNavigate: (tab: NavTab, meta?: any) => void;
}

export const CameraManagement: React.FC<CameraManagementProps> = ({
  cameras,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('All');
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>('All Cameras');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const isDark = trafficStore.getTheme() === 'dark';

  // Add camera form state
  const [newCode, setNewCode] = useState<string>('CAM-255');
  const [newName, setNewName] = useState<string>('Kanakapura Road Metro Pillar 110');
  const [newLocation, setNewLocation] = useState<string>('Kanakapura Main Road');
  const [newLat, setNewLat] = useState<number>(12.9050);
  const [newLng, setNewLng] = useState<number>(77.5600);
  const [newZone, setNewZone] = useState<CityZone>('South');
  const [newIp, setNewIp] = useState<string>('10.24.125.10');

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

  const handleToggleStatus = (cam: Camera) => {
    const nextStatus: CameraStatus = cam.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    trafficStore.updateCameraStatus(cam.id, nextStatus);
  };

  const handleAddCamera = (e: React.FormEvent) => {
    e.preventDefault();
    trafficStore.addCamera({
      code: newCode,
      name: newName,
      location: newLocation,
      lat: Number(newLat),
      lng: Number(newLng),
      zone: newZone,
      status: 'ONLINE',
      cameraType: 'ANPR Traffic Camera',
      aiModules: ['Optical ANPR', 'Speed Radar', 'Red Light Enforcement', 'Traffic Density', 'Wrong-Way Detection'],
      vehiclesPerMin: 45,
      trafficLevel: 'Moderate',
      lastDetectedPlate: 'KA01AB1234',
      avgSpeed: 38,
      direction: 'Southbound',
      resolution: '4K Ultra HD (3840x2160)',
      fps: 30,
      ipAddress: newIp,
      installDate: new Date().toISOString().split('T')[0]
    });

    setShowAddModal(false);
  };

  const filterOptions: CameraFilter[] = ['All Cameras', 'Online', 'Offline', 'Maintenance'];

  const cardBg = isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200 shadow-xs';
  const textTitle = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-neutral-400' : 'text-slate-500';
  const dividerBorder = isDark ? 'border-neutral-800' : 'border-slate-200';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${dividerBorder}`}>
        <div>
          <h2 className={`text-xl font-extrabold tracking-tight font-sans ${textTitle}`}>
            ANPR Camera Infrastructure & Sensor Management
          </h2>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Configure 50+ city-wide optical ANPR cameras with integrated AI modules (speed radar, red-light enforcement, flow density).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow border ${
            isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Register New ANPR Camera</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className={`${cardBg} border rounded-2xl p-3.5 space-y-3 font-mono text-xs`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Filter by code, location, IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl focus:outline-none border ${
                isDark ? 'bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className={textMuted}>Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className={`rounded-xl px-3 py-1.5 focus:outline-none border ${
                isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="All">All Zones</option>
              <option value="Central">Central</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Tech Corridor">Tech Corridor</option>
            </select>
          </div>
        </div>

        {/* Camera Status Filter: All Cameras / Online / Offline / Maintenance */}
        <div className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-3 ${dividerBorder}`}>
          <div className="flex items-center gap-2">
            <span className={`font-medium mr-1 ${textMuted}`}>Filter:</span>
            {filterOptions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedFilter(opt)}
                className={`px-3 py-1 rounded-xl text-xs font-mono transition-colors border ${
                  selectedFilter === opt
                    ? isDark 
                      ? 'bg-neutral-800 text-white border-neutral-600 font-bold' 
                      : 'bg-slate-900 text-white border-slate-900 font-bold'
                    : isDark 
                      ? 'bg-black text-neutral-400 border-neutral-800 hover:bg-neutral-900' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt === 'Online' && <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />}
                {opt === 'Offline' && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />}
                {opt === 'Maintenance' && <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5" />}
                {opt}
              </button>
            ))}
          </div>

          <span className={textMuted}>Showing {filteredCameras.length} ANPR Nodes</span>
        </div>
      </div>

      {/* Cameras Management Table */}
      <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className={`border-b uppercase text-[11px] ${dividerBorder} ${
                isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-slate-50 text-slate-600'
              }`}>
                <th className="py-3.5 px-3.5">Camera ID</th>
                <th className="py-3.5 px-3.5">Location & Zone</th>
                <th className="py-3.5 px-3.5">Enabled AI Modules</th>
                <th className="py-3.5 px-3.5">IP Address</th>
                <th className="py-3.5 px-3.5">Uptime</th>
                <th className="py-3.5 px-3.5">Vehicles Today</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dividerBorder}`}>
              {filteredCameras.map(cam => {
                const statusBadge = 
                  cam.status === 'ONLINE' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
                  cam.status === 'OFFLINE' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                  'bg-amber-500/15 text-amber-500 border-amber-500/30';

                return (
                  <tr key={cam.id} className={`transition-colors ${
                    isDark ? 'hover:bg-neutral-900' : 'hover:bg-slate-50'
                  }`}>
                    <td className="py-3.5 px-3.5 font-bold">
                      <button
                        type="button"
                        onClick={() => onNavigate('cameras', { selectedCamera: cam })}
                        className={`hover:underline font-bold ${textTitle}`}
                      >
                        {cam.code}
                      </button>
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className={`font-sans font-semibold ${textTitle}`}>{cam.name}</div>
                      <div className={`text-[10px] ${textMuted}`}>{cam.location} ({cam.zone})</div>
                    </td>
                    <td className="py-3.5 px-3.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded text-[10px] font-bold">
                          ANPR & OCR
                        </span>
                        <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded text-[10px]">
                          Speed Radar
                        </span>
                        <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded text-[10px]">
                          Red Light
                        </span>
                      </div>
                    </td>
                    <td className={`py-3.5 px-3.5 ${textMuted}`}>{cam.ipAddress}</td>
                    <td className="py-3.5 px-3.5 text-emerald-500 font-bold">{cam.uptime}%</td>
                    <td className={`py-3.5 px-3.5 font-bold ${textTitle}`}>{cam.vehiclesToday.toLocaleString()}</td>
                    <td className="py-3.5 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-bold ${statusBadge}`}>
                        ● {cam.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-2 font-sans">
                        <button
                          type="button"
                          onClick={() => onNavigate('cameras', { selectedCamera: cam })}
                          className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors border ${
                            isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                          }`}
                        >
                          View Feed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cam)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            cam.status === 'ONLINE' ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-red-500 hover:bg-red-500/10'
                          }`}
                          title={cam.status === 'ONLINE' ? 'Disable Camera Stream' : 'Enable Camera Stream'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className={`${cardBg} border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50`}>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-500" />
                <h3 className={`text-sm font-bold uppercase tracking-wider font-mono ${textTitle}`}>
                  Register ANPR Camera Sensor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCamera} className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${textTitle}`}>Camera Code*</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className={`w-full p-2 rounded-xl uppercase focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${textTitle}`}>Zone</label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value as CityZone)}
                    className={`w-full p-2 rounded-xl focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Central">Central</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="Tech Corridor">Tech Corridor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${textTitle}`}>Camera Description / Name*</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full p-2 rounded-xl font-sans focus:outline-none border ${
                    isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 ${textTitle}`}>Physical Location*</label>
                <input
                  type="text"
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className={`w-full p-2 rounded-xl font-sans focus:outline-none border ${
                    isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${textTitle}`}>Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLat}
                    onChange={(e) => setNewLat(parseFloat(e.target.value))}
                    className={`w-full p-2 rounded-xl focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 ${textTitle}`}>Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLng}
                    onChange={(e) => setNewLng(parseFloat(e.target.value))}
                    className={`w-full p-2 rounded-xl focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${textTitle}`}>IP Address</label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className={`w-full p-2 rounded-xl focus:outline-none border ${
                    isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              {/* Integrated AI Capabilities Notice */}
              <div className={`p-2.5 rounded-xl border text-[11px] font-sans ${
                isDark ? 'bg-black border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <div className="font-bold font-mono text-emerald-500 mb-1 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Standard Integrated AI Pipeline Enabled:</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                  <span>✓ Optical ANPR (OCR)</span>
                  <span>✓ Doppler Speed Radar</span>
                  <span>✓ Red-Light Enforcement</span>
                  <span>✓ Density & Queue Flow</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-bold shadow border ${
                    isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  }`}
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
