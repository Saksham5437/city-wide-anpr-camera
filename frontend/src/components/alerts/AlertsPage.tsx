import React, { useState } from 'react';
import { Alert, WatchlistItem, AlertSeverity, VehicleClass } from '../../types';
import { trafficStore } from '../../services/trafficStore';
import { 
  Bell, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  Route, 
  Camera, 
  Eye, 
  UserCheck,
  Search,
  Filter
} from 'lucide-react';
import { NavTab } from '../layout/Sidebar';

interface AlertsPageProps {
  alerts: Alert[];
  watchlist: WatchlistItem[];
  onNavigate: (tab: NavTab, meta?: any) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  watchlist,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist'>('alerts');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [showAddWatchlistModal, setShowAddWatchlistModal] = useState<boolean>(false);

  const isDark = trafficStore.getTheme() === 'dark';

  // New Watchlist Item Form State
  const [newPlate, setNewPlate] = useState<string>('');
  const [newType, setNewType] = useState<VehicleClass>('Car');
  const [newColor, setNewColor] = useState<string>('White');
  const [newReason, setNewReason] = useState<string>('');
  const [newPriority, setNewPriority] = useState<'Critical' | 'High' | 'Medium'>('High');
  const [newNotes, setNewNotes] = useState<string>('');

  const filteredAlerts = alerts.filter(a => {
    return selectedSeverity === 'All' || a.type === selectedSeverity;
  });

  const handleAddWatchlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlate || !newReason) return;

    trafficStore.addToWatchlist({
      plate: newPlate.toUpperCase().trim(),
      vehicleType: newType,
      color: newColor,
      reason: newReason,
      priority: newPriority,
      addedBy: 'Government Operator (BTP TMC)',
      notes: newNotes || 'Added via Control Room Alert Center',
      isActive: true
    });

    setNewPlate('');
    setNewReason('');
    setNewNotes('');
    setShowAddWatchlistModal(false);
  };

  const handleRemoveWatchlist = (id: string) => {
    trafficStore.removeFromWatchlist(id);
  };

  const handleAcknowledge = (id: string) => {
    trafficStore.acknowledgeAlert(id);
  };

  const handleResolve = (id: string) => {
    trafficStore.resolveAlert(id);
  };

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
            Alert Center & High-Priority Surveillance Watchlist
          </h2>
          <p className={`text-xs mt-1 font-sans ${textMuted}`}>
            Automated event triggers for flagged suspect vehicles, traffic anomalies, and surveillance sensor health.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2.5">
          <div className={`${cardBg} p-1.5 rounded-2xl border flex items-center gap-1.5 font-mono text-xs shadow-xs`}>
            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                activeTab === 'alerts' 
                  ? isDark ? 'bg-neutral-800 text-white font-bold' : 'bg-slate-900 text-white font-bold' 
                  : textMuted
              }`}
            >
              System Alerts ({alerts.filter(a => a.status === 'ACTIVE').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('watchlist')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                activeTab === 'watchlist' 
                  ? isDark ? 'bg-neutral-800 text-white font-bold' : 'bg-slate-900 text-white font-bold' 
                  : textMuted
              }`}
            >
              Suspect Watchlist ({watchlist.length})
            </button>
          </div>

          {activeTab === 'watchlist' && (
            <button
              type="button"
              onClick={() => setShowAddWatchlistModal(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll Target</span>
            </button>
          )}
        </div>
      </div>

      {/* View 1: Alerts List */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Severity Filter Toolbar */}
          <div className={`${cardBg} border rounded-2xl p-3.5 flex items-center justify-between font-mono text-xs`}>
            <div className="flex items-center gap-2">
              <span className={`font-medium ${textMuted}`}>Severity:</span>
              {(['All', 'Critical', 'Warning', 'Information'] as const).map(sev => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-3 py-1 rounded-xl transition-colors border ${
                    selectedSeverity === sev 
                      ? isDark ? 'bg-neutral-800 text-white border-neutral-600 font-bold' : 'bg-slate-900 text-white border-slate-900 font-bold' 
                      : textMuted
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <span className={textMuted}>
              Showing {filteredAlerts.length} Events
            </span>
          </div>

          {/* Alerts Card List */}
          <div className="space-y-3">
            {filteredAlerts.map(alt => {
              const borderCol = 
                alt.type === 'Critical' ? 'border-l-4 border-l-red-500' :
                alt.type === 'Warning' ? 'border-l-4 border-l-amber-500' :
                'border-l-4 border-l-neutral-400';

              const badgeCol = 
                alt.type === 'Critical' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                alt.type === 'Warning' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';

              return (
                <div 
                  key={alt.id}
                  className={`${cardBg} border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${borderCol}`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeCol}`}>
                        ● {alt.type.toUpperCase()}
                      </span>
                      <span className={`text-xs font-mono ${textMuted}`}>{alt.timestamp}</span>
                      <span className={`text-xs font-mono ${textMuted}`}>|</span>
                      <span className={`text-xs font-mono font-bold ${textTitle}`}>{alt.location}</span>
                    </div>

                    <h4 className={`text-sm font-bold font-sans ${textTitle}`}>{alt.title}</h4>
                    <p className={`text-xs font-sans ${textMuted}`}>{alt.description}</p>

                    {alt.actionRequired && (
                      <div className="text-[11px] font-mono text-amber-500 font-semibold flex items-center gap-1.5 pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>Protocol Directive: {alt.actionRequired}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0 font-mono text-xs">
                    {alt.vehiclePlate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('tracking', { plate: alt.vehiclePlate })}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center gap-1 border ${
                          isDark ? 'bg-neutral-900 text-white border-neutral-700 hover:bg-neutral-800' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        <Route className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Track {alt.vehiclePlate}</span>
                      </button>
                    )}

                    {alt.cameraCode && (
                      <button
                        type="button"
                        onClick={() => onNavigate('cameras', { selectedCameraCode: alt.cameraCode })}
                        className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 font-semibold border ${
                          isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Feed</span>
                      </button>
                    )}

                    {alt.status === 'ACTIVE' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(alt.id)}
                          className={`px-3 py-1.5 rounded-xl border transition-colors ${
                            isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolve(alt.id)}
                          className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/35 rounded-xl transition-colors font-semibold"
                        >
                          Resolve
                        </button>
                      </>
                    ) : (
                      <span className={`px-2.5 py-1 font-bold ${textMuted}`}>
                        ✓ {alt.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View 2: Watchlist */}
      {activeTab === 'watchlist' && (
        <div className="space-y-4">
          <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className={`border-b uppercase text-[11px] ${dividerBorder} ${
                  isDark ? 'bg-neutral-900 text-neutral-400' : 'bg-slate-50 text-slate-600'
                }`}>
                  <th className="py-3.5 px-3.5">Vehicle Plate</th>
                  <th className="py-3.5 px-3.5">Class & Color</th>
                  <th className="py-3.5 px-3.5">Surveillance Reason</th>
                  <th className="py-3.5 px-3.5">Priority</th>
                  <th className="py-3.5 px-3.5">Enrolled By</th>
                  <th className="py-3.5 px-3.5">Enrolled Date</th>
                  <th className="py-3.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dividerBorder}`}>
                {watchlist.map(item => {
                  const prioBadge = 
                    item.priority === 'Critical' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                    item.priority === 'High' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
                    'bg-amber-500/15 text-amber-500 border-amber-500/30';

                  return (
                    <tr key={item.id} className={`transition-colors ${
                      isDark ? 'hover:bg-neutral-900' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-3.5 px-3.5">
                        <button
                          type="button"
                          onClick={() => onNavigate('search', { query: item.plate })}
                          className="font-bold text-amber-500 hover:underline text-sm"
                        >
                          {item.plate}
                        </button>
                      </td>
                      <td className={`py-3.5 px-3.5 font-sans ${textTitle}`}>{item.vehicleType} • {item.color}</td>
                      <td className={`py-3.5 px-3.5 font-sans max-w-xs ${textTitle}`}>{item.reason}</td>
                      <td className="py-3.5 px-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border font-bold ${prioBadge}`}>
                          {item.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className={`py-3.5 px-3.5 font-sans ${textMuted}`}>{item.addedBy}</td>
                      <td className={`py-3.5 px-3.5 ${textMuted}`}>{item.addedDate}</td>
                      <td className="py-3.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2 font-sans">
                          <button
                            type="button"
                            onClick={() => onNavigate('tracking', { plate: item.plate })}
                            className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-colors border ${
                              isDark ? 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                            }`}
                          >
                            Track
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveWatchlist(item.id)}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* Add Watchlist Target Modal */}
      {showAddWatchlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className={`${cardBg} border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50`}>
            <div className={`flex items-center justify-between pb-3 border-b ${dividerBorder}`}>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <h3 className={`text-sm font-bold uppercase tracking-wider font-mono ${textTitle}`}>
                  Enroll Suspect Target
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWatchlistModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWatchlist} className="space-y-3 font-mono text-xs">
              <div>
                <label className={`block mb-1 font-semibold ${textTitle}`}>Registration Number (Plate)*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA01AB1234"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  className={`w-full p-2.5 rounded-xl font-bold font-mono focus:outline-none uppercase border ${
                    isDark ? 'bg-black border-neutral-800 text-amber-400 focus:border-neutral-500' : 'bg-slate-50 border-slate-200 text-amber-600 focus:border-slate-400'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 ${textTitle}`}>Vehicle Class</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as VehicleClass)}
                    className={`w-full p-2 rounded-xl font-mono text-xs focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <option value="Car">Car</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Auto-rickshaw">Auto-rickshaw</option>
                    <option value="Bus">Bus</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 ${textTitle}`}>Color</label>
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className={`w-full p-2 rounded-xl text-xs focus:outline-none border ${
                      isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block mb-1 ${textTitle}`}>Watchlist Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className={`w-full p-2 rounded-xl font-mono text-xs focus:outline-none border ${
                    isDark ? 'bg-black border-neutral-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="Critical">Critical Priority (Immediate Intercept)</option>
                  <option value="High">High Priority (Speed/Traffic Offenses)</option>
                  <option value="Medium">Medium Priority (Routine Monitoring)</option>
                </select>
              </div>

              <div>
                <label className={`block mb-1 ${textTitle}`}>Surveillance Reason / Case Brief*</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Evaded traffic stop at Richmond Circle; court warrant issued"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl font-sans text-xs focus:outline-none border ${
                    isDark ? 'bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-neutral-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-slate-400'
                  }`}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setShowAddWatchlistModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                    isDark ? 'bg-neutral-900 text-neutral-300' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Enroll Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
